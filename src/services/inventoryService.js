const mongoose = require('mongoose');
const WarehouseInventory = require('../models/WarehouseInventory');
const Warehouse = require('../models/Warehouse');
const RawMaterial = require('../models/RawMaterial');
const Product = require('../models/Product');
const Order = require('../models/Order');
const WarehouseTransfer = require('../models/WarehouseTransfer');
const AluminiumProduction = require('../models/AluminiumProduction');

/**
 * Execute a function within a MongoDB session/transaction, with fallback
 * for standalone MongoDB instances that do not support transactions.
 */
const withTransaction = async (callback) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    // Check if error is due to transactions not supported (e.g. standalone MongoDB)
    if (
      error.message &&
      (error.message.includes('Transactions are not supported') ||
        error.message.includes('replica set') ||
        error.message.includes('standalone'))
    ) {
      console.warn('MongoDB transaction not supported on standalone instance; executing without transaction.');
      return await callback(null);
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * Update stock for an item in a specific warehouse atomically.
 * Prevents negative stock.
 */
const updateWarehouseStock = async ({ warehouseId, itemType, itemId, deltaStock, session = null }) => {
  const options = session ? { session, new: true, upsert: true } : { new: true, upsert: true };

  // First check if deducting stock
  if (deltaStock < 0) {
    const existing = await WarehouseInventory.findOne({
      warehouse: warehouseId,
      itemType,
      item: itemId
    }).session(session);

    const current = existing ? existing.currentStock : 0;
    if (current + deltaStock < 0) {
      const warehouseDoc = await Warehouse.findById(warehouseId).session(session);
      const whName = warehouseDoc ? warehouseDoc.name : 'selected warehouse';
      throw new Error(
        `Insufficient stock in ${whName}. Current available stock is ${current}, cannot deduct ${Math.abs(deltaStock)}.`
      );
    }
  }

  const updated = await WarehouseInventory.findOneAndUpdate(
    { warehouse: warehouseId, itemType, item: itemId },
    { $inc: { currentStock: deltaStock } },
    options
  );

  return updated;
};

/**
 * Get warehouse-wise stock breakdown for an item
 */
const getItemWarehouseStocks = async (itemType, itemId) => {
  const [warehouses, records] = await Promise.all([
    Warehouse.find({ status: 'Active' }).sort({ code: 1 }).lean(),
    WarehouseInventory.find({ itemType, item: itemId }).lean()
  ]);

  const recordMap = new Map();
  for (const r of records) {
    recordMap.set(r.warehouse.toString(), r);
  }

  let totalStock = 0;
  let totalAvailable = 0;

  const warehouseStocks = warehouses.map((wh) => {
    const rec = recordMap.get(wh._id.toString());
    const current = rec ? rec.currentStock || 0 : 0;
    const reserved = rec ? rec.reservedStock || 0 : 0;
    const available = Math.max(0, current - reserved);
    totalStock += current;
    totalAvailable += available;
    return {
      warehouseId: wh._id,
      warehouseName: wh.name,
      warehouseCode: wh.code,
      currentStock: current,
      reservedStock: reserved,
      availableStock: available
    };
  });

  return {
    warehouseStocks,
    totalStock,
    totalAvailable
  };
};

/**
 * Calculate dynamic Raw Material inventory details and status (single item)
 */
const calculateRawMaterialInventory = async (rawMaterialId) => {
  const objId = new mongoose.Types.ObjectId(rawMaterialId);

  const [material, stockData, purchaseAgg, prodAgg] = await Promise.all([
    RawMaterial.findById(objId).lean(),
    getItemWarehouseStocks('RawMaterial', objId),
    Order.aggregate([
      {
        $match: {
          orderType: 'PURCHASE',
          status: 'Completed',
          'items.itemType': 'RawMaterial',
          'items.item': objId
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.itemType': 'RawMaterial',
          'items.item': objId
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$items.quantity' }
        }
      }
    ]),
    AluminiumProduction.aggregate([
      {
        $match: {
          rawMaterial: objId,
          status: 'Completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$productionQuantity' }
        }
      }
    ])
  ]);

  if (!material) throw new Error('Raw material not found');

  const { warehouseStocks, totalStock } = stockData;
  const purchasedQuantity = purchaseAgg.length > 0 ? purchaseAgg[0].total : 0;
  const productionOutput = prodAgg.length > 0 ? prodAgg[0].total : 0;

  let reorderStatus = 'Available';
  if (totalStock === 0) {
    reorderStatus = 'Out of Stock';
  } else if (totalStock <= material.reorderPoint) {
    reorderStatus = 'Low Stock';
  }

  return {
    rawMaterial: material,
    startingInventory: material.startingInventory,
    purchasedQuantity,
    productionOutput,
    currentInventory: totalStock,
    reorderPoint: material.reorderPoint,
    reorderStatus,
    warehouseStocks
  };
};

/**
 * Batch calculate dynamic Raw Material inventory details for multiple materials in O(1) queries
 */
const calculateBatchRawMaterialInventory = async (materials) => {
  if (!materials || materials.length === 0) return [];

  const materialIds = materials.map((m) => new mongoose.Types.ObjectId(m._id));

  const [warehouses, inventories, purchaseAgg, prodAgg] = await Promise.all([
    Warehouse.find({ status: 'Active' }).sort({ code: 1 }).lean(),
    WarehouseInventory.find({ itemType: 'RawMaterial', item: { $in: materialIds } }).lean(),
    Order.aggregate([
      {
        $match: {
          orderType: 'PURCHASE',
          status: 'Completed',
          'items.itemType': 'RawMaterial',
          'items.item': { $in: materialIds }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.itemType': 'RawMaterial',
          'items.item': { $in: materialIds }
        }
      },
      {
        $group: {
          _id: '$items.item',
          total: { $sum: '$items.quantity' }
        }
      }
    ]),
    AluminiumProduction.aggregate([
      {
        $match: {
          rawMaterial: { $in: materialIds },
          status: 'Completed'
        }
      },
      {
        $group: {
          _id: '$rawMaterial',
          total: { $sum: '$productionQuantity' }
        }
      }
    ])
  ]);

  // Index inventories by `${itemId}_${warehouseId}`
  const invMap = new Map();
  for (const inv of inventories) {
    invMap.set(`${inv.item.toString()}_${inv.warehouse.toString()}`, inv);
  }

  const purchaseMap = new Map();
  for (const p of purchaseAgg) {
    purchaseMap.set(p._id.toString(), p.total);
  }

  const prodMap = new Map();
  for (const pr of prodAgg) {
    prodMap.set(pr._id.toString(), pr.total);
  }

  return materials.map((mat) => {
    const plainMat = typeof mat.toObject === 'function' ? mat.toObject() : mat;
    const matIdStr = plainMat._id.toString();

    let totalStock = 0;
    const warehouseStocks = warehouses.map((wh) => {
      const rec = invMap.get(`${matIdStr}_${wh._id.toString()}`);
      const current = rec ? rec.currentStock || 0 : 0;
      const reserved = rec ? rec.reservedStock || 0 : 0;
      const available = Math.max(0, current - reserved);
      totalStock += current;
      return {
        warehouseId: wh._id,
        warehouseName: wh.name,
        warehouseCode: wh.code,
        currentStock: current,
        reservedStock: reserved,
        availableStock: available
      };
    });

    const purchasedQuantity = purchaseMap.get(matIdStr) || 0;
    const productionOutput = prodMap.get(matIdStr) || 0;

    let reorderStatus = 'Available';
    if (totalStock === 0) {
      reorderStatus = 'Out of Stock';
    } else if (totalStock <= plainMat.reorderPoint) {
      reorderStatus = 'Low Stock';
    }

    return {
      ...plainMat,
      currentInventory: totalStock,
      purchasedQuantity,
      productionOutput,
      reorderStatus,
      warehouseStocks
    };
  });
};

/**
 * Calculate Product Sales Quantity dynamically from completed SALE orders (single item)
 */
const calculateProductSalesAndStock = async (productId) => {
  const objId = new mongoose.Types.ObjectId(productId);

  const [product, saleAgg, stockData] = await Promise.all([
    Product.findById(objId).lean(),
    Order.aggregate([
      {
        $match: {
          orderType: 'SALE',
          status: 'Completed',
          'items.itemType': 'Product',
          'items.item': objId
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.itemType': 'Product',
          'items.item': objId
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$items.quantity' }
        }
      }
    ]),
    getItemWarehouseStocks('Product', objId)
  ]);

  if (!product) throw new Error('Product not found');

  const salesQuantity = saleAgg.length > 0 ? saleAgg[0].total : 0;
  const { warehouseStocks, totalStock, totalAvailable } = stockData;

  return {
    product,
    salesQuantity,
    totalStock,
    totalAvailable,
    warehouseStocks
  };
};

/**
 * Batch calculate Product Sales & Stock for multiple products in O(1) queries
 */
const calculateBatchProductStats = async (products) => {
  const statsMap = new Map();
  if (!products || products.length === 0) return statsMap;

  const productIds = products.map((p) => new mongoose.Types.ObjectId(p._id));

  const [warehouses, inventories, saleAgg] = await Promise.all([
    Warehouse.find({ status: 'Active' }).sort({ code: 1 }).lean(),
    WarehouseInventory.find({ itemType: 'Product', item: { $in: productIds } }).lean(),
    Order.aggregate([
      {
        $match: {
          orderType: 'SALE',
          status: 'Completed',
          'items.itemType': 'Product',
          'items.item': { $in: productIds }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.itemType': 'Product',
          'items.item': { $in: productIds }
        }
      },
      {
        $group: {
          _id: '$items.item',
          total: { $sum: '$items.quantity' }
        }
      }
    ])
  ]);

  const invMap = new Map();
  for (const inv of inventories) {
    invMap.set(`${inv.item.toString()}_${inv.warehouse.toString()}`, inv);
  }

  const saleMap = new Map();
  for (const s of saleAgg) {
    saleMap.set(s._id.toString(), s.total);
  }

  for (const prod of products) {
    const prodIdStr = prod._id.toString();
    let totalStock = 0;
    let totalAvailable = 0;

    const warehouseStocks = warehouses.map((wh) => {
      const rec = invMap.get(`${prodIdStr}_${wh._id.toString()}`);
      const current = rec ? rec.currentStock || 0 : 0;
      const reserved = rec ? rec.reservedStock || 0 : 0;
      const available = Math.max(0, current - reserved);
      totalStock += current;
      totalAvailable += available;
      return {
        warehouseId: wh._id,
        warehouseName: wh.name,
        warehouseCode: wh.code,
        currentStock: current,
        reservedStock: reserved,
        availableStock: available
      };
    });

    statsMap.set(prodIdStr, {
      salesQuantity: saleMap.get(prodIdStr) || 0,
      totalStock,
      totalAvailable,
      warehouseStocks
    });
  }

  return statsMap;
};

module.exports = {
  withTransaction,
  updateWarehouseStock,
  getItemWarehouseStocks,
  calculateRawMaterialInventory,
  calculateBatchRawMaterialInventory,
  calculateProductSalesAndStock,
  calculateBatchProductStats
};
