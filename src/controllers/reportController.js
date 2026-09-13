const Order = require('../models/Order');
const Product = require('../models/Product');
const RawMaterial = require('../models/RawMaterial');
const Warehouse = require('../models/Warehouse');
const WarehouseInventory = require('../models/WarehouseInventory');
const WarehouseTransfer = require('../models/WarehouseTransfer');
const AluminiumInventory = require('../models/AluminiumInventory');
const AluminiumPurchase = require('../models/AluminiumPurchase');
const AluminiumProduction = require('../models/AluminiumProduction');
const AluminiumLedger = require('../models/AluminiumLedger');
const BOM = require('../models/BOM');
const { getAluminiumInventory } = require('../services/aluminiumService');
const { getAllProductsCapacitySummary } = require('../services/bomCalculationService');
const { calculateRawMaterialInventory, calculateProductSalesAndStock } = require('../services/inventoryService');

// Helper to parse date filters
const buildDateFilter = (field, startDate, endDate) => {
  if (!startDate && !endDate) return {};
  const filter = {};
  if (startDate) filter.$gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filter.$lte = end;
  }
  return { [field]: filter };
};

// @route   GET /api/reports/sales
const getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, warehouseId, status } = req.query;
    const query = { orderType: 'SALE', ...buildDateFilter('orderDate', startDate, endDate) };
    if (warehouseId) query.warehouse = warehouseId;
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('warehouse', 'name code')
      .populate('items.item', 'name sku unit category')
      .sort({ orderDate: -1 });

    const rows = [];
    orders.forEach((ord) => {
      ord.items.forEach((item) => {
        rows.push({
          orderNumber: ord.orderNumber,
          date: ord.orderDate.toISOString().split('T')[0],
          partyName: ord.partyName || 'Customer',
          warehouse: ord.warehouse?.name || 'N/A',
          itemType: item.itemType || 'Product',
          itemName: item.item?.name || 'Item',
          sku: item.item?.sku || 'N/A',
          quantity: item.quantity,
          unit: item.item?.unit || 'Pcs',
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          status: ord.status,
          notes: ord.notes
        });
      });
    });

    res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/reports/purchases
const getPurchaseReport = async (req, res, next) => {
  try {
    const { startDate, endDate, warehouseId, status } = req.query;
    const query = { orderType: 'PURCHASE', ...buildDateFilter('orderDate', startDate, endDate) };
    if (warehouseId) query.warehouse = warehouseId;
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('warehouse', 'name code')
      .populate('items.item', 'name sku unit category')
      .sort({ orderDate: -1 });

    const rows = [];
    orders.forEach((ord) => {
      ord.items.forEach((item) => {
        rows.push({
          orderNumber: ord.orderNumber,
          date: ord.orderDate.toISOString().split('T')[0],
          supplier: ord.partyName || 'Supplier',
          warehouse: ord.warehouse?.name || 'N/A',
          itemName: item.item?.name || 'Deleted Material',
          sku: item.item?.sku || 'N/A',
          quantity: item.quantity,
          unit: item.item?.unit || 'Pcs',
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          status: ord.status,
          notes: ord.notes
        });
      });
    });

    res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/reports/inventory
const getInventoryReport = async (req, res, next) => {
  try {
    const { type = 'all' } = req.query; // 'all', 'products', 'raw-materials'
    const rows = [];

    if (type === 'all' || type === 'products') {
      const products = await Product.find({ status: 'Active' }).sort({ name: 1 });
      for (const p of products) {
        const stats = await calculateProductSalesAndStock(p._id);
        rows.push({
          itemType: 'Product',
          name: p.name,
          sku: p.sku,
          category: p.category,
          unit: p.unit,
          currentStock: stats.totalStock,
          salesQuantity: stats.salesQuantity,
          reorderPoint: p.reorderPoint || 0,
          status: stats.totalStock === 0 ? 'Out of Stock' : stats.totalStock <= p.reorderPoint ? 'Low Stock' : 'In Stock'
        });
      }
    }

    if (type === 'all' || type === 'raw-materials') {
      const materials = await RawMaterial.find({ status: 'Active' }).sort({ name: 1 });
      for (const m of materials) {
        const inv = await calculateRawMaterialInventory(m._id);
        rows.push({
          itemType: 'RawMaterial',
          name: m.name,
          sku: m.sku,
          category: m.category,
          unit: m.unit,
          currentStock: inv.currentInventory,
          startingInventory: m.startingInventory,
          reorderPoint: m.reorderPoint,
          status: inv.reorderStatus
        });
      }
    }

    res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/reports/low-stock
const getLowStockReport = async (req, res, next) => {
  try {
    const materials = await RawMaterial.find({ status: 'Active' });
    const lowStockList = [];

    for (const m of materials) {
      const inv = await calculateRawMaterialInventory(m._id);
      if (inv.reorderStatus === 'Low Stock' || inv.reorderStatus === 'Out of Stock') {
        lowStockList.push({
          name: m.name,
          sku: m.sku,
          category: m.category,
          unit: m.unit,
          currentStock: inv.currentInventory,
          reorderPoint: m.reorderPoint,
          deficit: Math.max(0, m.reorderPoint - inv.currentInventory),
          supplier: m.supplier || 'N/A',
          status: inv.reorderStatus
        });
      }
    }

    res.status(200).json({ success: true, count: lowStockList.length, data: lowStockList });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/reports/capacity
const getCapacityReport = async (req, res, next) => {
  try {
    const capacityData = await getAllProductsCapacitySummary();
    const formatted = capacityData.map((item) => ({
      productName: item.productName,
      sku: item.sku,
      category: item.category,
      finishedStock: item.finishedStock,
      hasBOM: item.hasBOM ? 'Configured' : 'No BOM',
      manufacturingCapacity: item.manufacturingCapacity,
      totalSupplyPotential: item.finishedStock + item.manufacturingCapacity,
      bottleneckMaterial: item.bottleneckMaterial
        ? `${item.bottleneckMaterial.name} (Max ${item.bottleneckMaterial.canMake} units)`
        : 'None (No Limit)',
      materialsCount: item.materialsCount
    }));
    res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/reports/transfers
const getTransferReport = async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;
    const query = { ...buildDateFilter('transferDate', startDate, endDate) };
    if (status) query.status = status;

    const transfers = await WarehouseTransfer.find(query)
      .populate('sourceWarehouse', 'name code')
      .populate('destinationWarehouse', 'name code')
      .populate('item', 'name sku unit')
      .populate('items.item', 'name sku unit')
      .sort({ transferDate: -1 });

    const rows = [];
    transfers.forEach((t) => {
      const lineItems = (t.items && t.items.length > 0)
        ? t.items
        : [{ itemType: t.itemType, item: t.item, quantity: t.quantity }];

      lineItems.forEach((it) => {
        rows.push({
          transferNumber: t.transferNumber,
          date: t.transferDate.toISOString().split('T')[0],
          itemType: it.itemType || t.itemType,
          itemName: it.item?.name || t.item?.name || 'Item',
          sku: it.item?.sku || t.item?.sku || 'N/A',
          quantity: it.quantity,
          unit: it.item?.unit || t.item?.unit || 'Pcs',
          fromWarehouse: t.sourceWarehouse?.name || 'N/A',
          toWarehouse: t.destinationWarehouse?.name || 'N/A',
          status: t.status,
          notes: t.notes
        });
      });
    });

    res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/reports/aluminium
const getAluminiumReports = async (req, res, next) => {
  try {
    const { subReport = 'ledger', startDate, endDate } = req.query;

    if (subReport === 'purchases') {
      const query = { ...buildDateFilter('purchaseDate', startDate, endDate) };
      const purchases = await AluminiumPurchase.find(query).sort({ purchaseDate: -1 });
      return res.status(200).json({ success: true, data: purchases });
    }

    if (subReport === 'productions') {
      const query = { ...buildDateFilter('productionDate', startDate, endDate) };
      const productions = await AluminiumProduction.find(query)
        .populate('rawMaterial', 'name sku unit')
        .populate('warehouse', 'name code')
        .sort({ productionDate: -1 });
      return res.status(200).json({ success: true, data: productions });
    }

    // Default: Ledger
    const query = { ...buildDateFilter('date', startDate, endDate) };
    const ledger = await AluminiumLedger.find(query).sort({ date: -1 });
    const inv = await getAluminiumInventory();

    res.status(200).json({
      success: true,
      summary: inv,
      data: ledger
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSalesReport,
  getPurchaseReport,
  getInventoryReport,
  getLowStockReport,
  getCapacityReport,
  getTransferReport,
  getAluminiumReports
};
