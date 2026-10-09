const BOM = require('../models/BOM');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const WarehouseInventory = require('../models/WarehouseInventory');

/**
 * Calculate manufacturing capacity and bottleneck material for a specific product
 */
const calculateProductCapacity = async (productId, warehouseId = null) => {
  const [product, bomEntries, activeWarehouses] = await Promise.all([
    Product.findById(productId).lean(),
    BOM.find({ product: productId }).populate('rawMaterial', 'name sku unit').lean(),
    warehouseId ? Promise.resolve([]) : Warehouse.find({ status: 'Active' }).select('_id').lean()
  ]);

  if (!product) throw new Error('Product not found');

  if (!bomEntries || bomEntries.length === 0) {
    return {
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      hasBOM: false,
      capacity: 0,
      bottleneckMaterial: null,
      materials: []
    };
  }

  const rmIds = bomEntries.filter((e) => e.rawMaterial).map((e) => e.rawMaterial._id);
  const invQuery = {
    itemType: 'RawMaterial',
    item: { $in: rmIds }
  };
  if (warehouseId) {
    invQuery.warehouse = warehouseId;
  } else {
    invQuery.warehouse = { $in: activeWarehouses.map((w) => w._id) };
  }

  const inventories = await WarehouseInventory.find(invQuery).lean();
  const rmAvailableMap = new Map();
  for (const inv of inventories) {
    const key = inv.item.toString();
    const avail = Math.max(0, (inv.currentStock || 0) - (inv.reservedStock || 0));
    rmAvailableMap.set(key, (rmAvailableMap.get(key) || 0) + avail);
  }

  let minUnits = Infinity;
  let bottleneckMaterial = null;
  const materials = [];

  for (const entry of bomEntries) {
    const rm = entry.rawMaterial;
    if (!rm) continue;

    const availableStock = rmAvailableMap.get(rm._id.toString()) || 0;
    const requiredPerUnit = entry.quantity;
    const canMake = Math.floor(availableStock / requiredPerUnit);

    materials.push({
      rawMaterialId: rm._id,
      rawMaterialName: rm.name,
      sku: rm.sku,
      unit: entry.unitOfMeasure || rm.unit,
      requiredPerUnit,
      availableStock,
      canMakeUnits: canMake
    });

    if (canMake < minUnits) {
      minUnits = canMake;
      bottleneckMaterial = {
        id: rm._id,
        name: rm.name,
        availableStock,
        requiredPerUnit,
        canMake
      };
    }
  }

  const capacity = minUnits === Infinity ? 0 : minUnits;

  return {
    productId: product._id,
    productName: product.name,
    sku: product.sku,
    hasBOM: true,
    capacity,
    bottleneckMaterial,
    materials
  };
};

/**
 * Batch calculate capacity for an array of products in O(1) DB queries
 */
const calculateBatchProductCapacities = async (products) => {
  const capMap = new Map();
  if (!products || products.length === 0) return capMap;

  const productIds = products.map((p) => p._id);

  const [bomEntries, activeWarehouses] = await Promise.all([
    BOM.find({ product: { $in: productIds } }).populate('rawMaterial', 'name sku unit').lean(),
    Warehouse.find({ status: 'Active' }).select('_id').lean()
  ]);

  const activeWhIds = activeWarehouses.map((w) => w._id);
  const rmIdsSet = new Set();
  const bomByProduct = new Map();

  for (const entry of bomEntries) {
    if (!entry.rawMaterial) continue;
    rmIdsSet.add(entry.rawMaterial._id.toString());
    const prodKey = entry.product.toString();
    if (!bomByProduct.has(prodKey)) {
      bomByProduct.set(prodKey, []);
    }
    bomByProduct.get(prodKey).push(entry);
  }

  const rmAvailableMap = new Map();
  if (rmIdsSet.size > 0) {
    const inventories = await WarehouseInventory.find({
      itemType: 'RawMaterial',
      item: { $in: Array.from(rmIdsSet) },
      warehouse: { $in: activeWhIds }
    }).lean();

    for (const inv of inventories) {
      const key = inv.item.toString();
      const avail = Math.max(0, (inv.currentStock || 0) - (inv.reservedStock || 0));
      rmAvailableMap.set(key, (rmAvailableMap.get(key) || 0) + avail);
    }
  }

  for (const prod of products) {
    const prodKey = prod._id.toString();
    const entries = bomByProduct.get(prodKey) || [];

    if (entries.length === 0) {
      capMap.set(prodKey, {
        hasBOM: false,
        capacity: 0,
        bottleneckMaterial: null,
        materialsCount: 0
      });
      continue;
    }

    let minUnits = Infinity;
    let bottleneckMaterial = null;

    for (const entry of entries) {
      const rm = entry.rawMaterial;
      const availableStock = rmAvailableMap.get(rm._id.toString()) || 0;
      const requiredPerUnit = entry.quantity;
      const canMake = Math.floor(availableStock / requiredPerUnit);

      if (canMake < minUnits) {
        minUnits = canMake;
        bottleneckMaterial = {
          id: rm._id,
          name: rm.name,
          availableStock,
          requiredPerUnit,
          canMake
        };
      }
    }

    capMap.set(prodKey, {
      hasBOM: true,
      capacity: minUnits === Infinity ? 0 : minUnits,
      bottleneckMaterial,
      materialsCount: entries.length
    });
  }

  return capMap;
};

/**
 * Calculate capacity for all active products (used for Dashboard and Today's Availability)
 * Optimized to execute in 4 parallel queries instead of N+1 loops
 */
const getAllProductsCapacitySummary = async () => {
  const [products, bomEntries, activeWarehouses, allInventories] = await Promise.all([
    Product.find({ status: 'Active' }).sort({ name: 1 }).lean(),
    BOM.find().populate('rawMaterial', 'name sku unit').lean(),
    Warehouse.find({ status: 'Active' }).select('_id').lean(),
    WarehouseInventory.find().lean()
  ]);

  const activeWhSet = new Set(activeWarehouses.map((w) => w._id.toString()));

  // Build stock maps for active warehouses
  const rmAvailableMap = new Map();
  const prodStockMap = new Map();

  for (const inv of allInventories) {
    if (!activeWhSet.has(inv.warehouse.toString())) continue;
    const itemKey = inv.item.toString();
    const current = inv.currentStock || 0;
    const reserved = inv.reservedStock || 0;
    const avail = Math.max(0, current - reserved);

    if (inv.itemType === 'RawMaterial') {
      rmAvailableMap.set(itemKey, (rmAvailableMap.get(itemKey) || 0) + avail);
    } else if (inv.itemType === 'Product') {
      prodStockMap.set(itemKey, (prodStockMap.get(itemKey) || 0) + current);
    }
  }

  // Group BOM entries by product
  const bomByProduct = new Map();
  for (const entry of bomEntries) {
    if (!entry.rawMaterial || !entry.product) continue;
    const prodKey = entry.product.toString();
    if (!bomByProduct.has(prodKey)) {
      bomByProduct.set(prodKey, []);
    }
    bomByProduct.get(prodKey).push(entry);
  }

  return products.map((prod) => {
    const prodKey = prod._id.toString();
    const entries = bomByProduct.get(prodKey) || [];
    const finishedStock = prodStockMap.get(prodKey) || 0;

    if (entries.length === 0) {
      return {
        productId: prod._id,
        productName: prod.name,
        sku: prod.sku,
        category: prod.category,
        finishedStock,
        hasBOM: false,
        manufacturingCapacity: 0,
        bottleneckMaterial: null,
        materialsCount: 0
      };
    }

    let minUnits = Infinity;
    let bottleneckMaterial = null;

    for (const entry of entries) {
      const rm = entry.rawMaterial;
      const availableStock = rmAvailableMap.get(rm._id.toString()) || 0;
      const requiredPerUnit = entry.quantity;
      const canMake = Math.floor(availableStock / requiredPerUnit);

      if (canMake < minUnits) {
        minUnits = canMake;
        bottleneckMaterial = {
          id: rm._id,
          name: rm.name,
          availableStock,
          requiredPerUnit,
          canMake
        };
      }
    }

    return {
      productId: prod._id,
      productName: prod.name,
      sku: prod.sku,
      category: prod.category,
      finishedStock,
      hasBOM: true,
      manufacturingCapacity: minUnits === Infinity ? 0 : minUnits,
      bottleneckMaterial,
      materialsCount: entries.length
    };
  });
};

module.exports = {
  calculateProductCapacity,
  calculateBatchProductCapacities,
  getAllProductsCapacitySummary
};
