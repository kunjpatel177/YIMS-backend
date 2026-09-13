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
  const warehouses = await Warehouse.find({ status: 'Active' }).sort({ code: 1 });
  const records = await WarehouseInventory.find({ itemType, item: itemId });

  const warehouseStocks = warehouses.map((wh) => {
    const rec = records.find((r) => r.warehouse.toString() === wh._id.toString());
    const current = rec ? rec.currentStock : 0;
    const reserved = rec ? rec.reservedStock : 0;
    return {
      warehouseId: wh._id,
      warehouseName: wh.name,
      warehouseCode: wh.code,
      currentStock: current,
      reservedStock: reserved,
      availableStock: Math.max(0, current - reserved)
    };
  });

  const totalStock = warehouseStocks.reduce((sum, item) => sum + item.currentStock, 0);
  const totalAvailable = warehouseStocks.reduce((sum, item) => sum + item.availableStock, 0);

  return {
    warehouseStocks,
    totalStock,
    totalAvailable
  };
};

/**
 * Calculate dynamic Raw Material inventory details and status
 */
const calculateRawMaterialInventory = async (rawMaterialId) => {
  const material = await RawMaterial.findById(rawMaterialId);
  if (!material) throw new Error('Raw material not found');

  const { warehouseStocks, totalStock } = await getItemWarehouseStocks('RawMaterial', rawMaterialId);

  // Purchased Quantity from completed purchase orders
  const purchaseOrders = await Order.find({
    orderType: 'PURCHASE',
    status: 'Completed',
    'items.itemType': 'RawMaterial',
    'items.item': rawMaterialId
  });

  let purchasedQuantity = 0;
  purchaseOrders.forEach((po) => {
    po.items.forEach((it) => {
      if (it.itemType === 'RawMaterial' && it.item.toString() === rawMaterialId.toString()) {
        purchasedQuantity += it.quantity;
      }
    });
  });

  // Production Output from completed aluminium production
  const productions = await AluminiumProduction.find({
    rawMaterial: rawMaterialId,
    status: 'Completed'
  });
  const productionOutput = productions.reduce((sum, p) => sum + p.productionQuantity, 0);

  // Determine Reorder Status
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
 * Calculate Product Sales Quantity dynamically from completed SALE orders
 */
const calculateProductSalesAndStock = async (productId) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');

  // Aggregated Sales Quantity from completed SALE orders
  const saleOrders = await Order.find({
    orderType: 'SALE',
    status: 'Completed',
    'items.itemType': 'Product',
    'items.item': productId
  });

  let salesQuantity = 0;
  saleOrders.forEach((so) => {
    so.items.forEach((it) => {
      if (it.itemType === 'Product' && it.item.toString() === productId.toString()) {
        salesQuantity += it.quantity;
      }
    });
  });

  const { warehouseStocks, totalStock, totalAvailable } = await getItemWarehouseStocks('Product', productId);

  return {
    product,
    salesQuantity,
    totalStock,
    totalAvailable,
    warehouseStocks
  };
};

module.exports = {
  withTransaction,
  updateWarehouseStock,
  getItemWarehouseStocks,
  calculateRawMaterialInventory,
  calculateProductSalesAndStock
};
