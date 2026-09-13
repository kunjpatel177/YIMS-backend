const BOM = require('../models/BOM');
const Product = require('../models/Product');
const RawMaterial = require('../models/RawMaterial');
const WarehouseInventory = require('../models/WarehouseInventory');
const { getItemWarehouseStocks } = require('./inventoryService');

/**
 * Calculate manufacturing capacity and bottleneck material for a specific product
 */
const calculateProductCapacity = async (productId, warehouseId = null) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');

  const bomEntries = await BOM.find({ product: productId }).populate('rawMaterial');

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

  let minUnits = Infinity;
  let bottleneckMaterial = null;
  const materials = [];

  for (const entry of bomEntries) {
    const rm = entry.rawMaterial;
    if (!rm) continue;

    let availableStock = 0;
    if (warehouseId) {
      const inv = await WarehouseInventory.findOne({
        warehouse: warehouseId,
        itemType: 'RawMaterial',
        item: rm._id
      });
      availableStock = inv ? Math.max(0, inv.currentStock - inv.reservedStock) : 0;
    } else {
      const stockInfo = await getItemWarehouseStocks('RawMaterial', rm._id);
      availableStock = stockInfo.totalAvailable;
    }

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
 * Calculate capacity for all active products (used for Dashboard and Today's Availability)
 */
const getAllProductsCapacitySummary = async () => {
  const products = await Product.find({ status: 'Active' }).sort({ name: 1 });
  const results = [];

  for (const prod of products) {
    const capacityInfo = await calculateProductCapacity(prod._id);
    const { totalStock } = await getItemWarehouseStocks('Product', prod._id);

    results.push({
      productId: prod._id,
      productName: prod.name,
      sku: prod.sku,
      category: prod.category,
      finishedStock: totalStock,
      hasBOM: capacityInfo.hasBOM,
      manufacturingCapacity: capacityInfo.capacity,
      bottleneckMaterial: capacityInfo.bottleneckMaterial,
      materialsCount: capacityInfo.materials.length
    });
  }

  return results;
};

module.exports = {
  calculateProductCapacity,
  getAllProductsCapacitySummary
};
