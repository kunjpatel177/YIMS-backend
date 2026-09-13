const Product = require('../models/Product');
const RawMaterial = require('../models/RawMaterial');
const Order = require('../models/Order');
const Warehouse = require('../models/Warehouse');
const WarehouseInventory = require('../models/WarehouseInventory');
const WarehouseTransfer = require('../models/WarehouseTransfer');
const AluminiumInventory = require('../models/AluminiumInventory');
const AluminiumPurchase = require('../models/AluminiumPurchase');
const AluminiumProduction = require('../models/AluminiumProduction');
const AluminiumLedger = require('../models/AluminiumLedger');
const { getAluminiumInventory } = require('../services/aluminiumService');
const { getAllProductsCapacitySummary } = require('../services/bomCalculationService');
const { calculateRawMaterialInventory } = require('../services/inventoryService');

// @route   GET /api/dashboard
// @desc    Get all aggregated metrics, KPI cards, charts, and recent activity
// @access  Private
const getDashboardData = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Basic Counts
    const [totalProducts, totalRawMaterials, totalWarehouses, aluInventory] = await Promise.all([
      Product.countDocuments({ status: 'Active' }),
      RawMaterial.countDocuments({ status: 'Active' }),
      Warehouse.countDocuments({ status: 'Active' }),
      getAluminiumInventory()
    ]);

    // 2. Orders Stats
    const [saleOrdersCount, purchaseOrdersCount, pendingTransfersCount, totalTransfersCount] = await Promise.all([
      Order.countDocuments({ orderType: 'SALE' }),
      Order.countDocuments({ orderType: 'PURCHASE' }),
      WarehouseTransfer.countDocuments({ status: 'Pending' }),
      WarehouseTransfer.countDocuments()
    ]);

    // 3. Today's Transactions
    const todayOrders = await Order.find({ orderDate: { $gte: today } });
    const todaySalesCount = todayOrders.filter((o) => o.orderType === 'SALE').length;
    const todayPurchasesCount = todayOrders.filter((o) => o.orderType === 'PURCHASE').length;

    // 4. Warehouse-wise Stock
    const warehouses = await Warehouse.find({ status: 'Active' }).sort({ code: 1 });
    const warehouseStockSummary = await Promise.all(
      warehouses.map(async (wh) => {
        const inventories = await WarehouseInventory.find({ warehouse: wh._id });
        const prodStock = inventories
          .filter((i) => i.itemType === 'Product')
          .reduce((sum, i) => sum + (i.currentStock || 0), 0);
        const rmStock = inventories
          .filter((i) => i.itemType === 'RawMaterial')
          .reduce((sum, i) => sum + (i.currentStock || 0), 0);
        return {
          warehouseId: wh._id,
          name: wh.name,
          code: wh.code,
          productStock: prodStock,
          rawMaterialStock: rmStock,
          totalStock: prodStock + rmStock
        };
      })
    );

    // 5. Raw Materials Health Check
    const allMaterials = await RawMaterial.find({ status: 'Active' });
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockList = [];

    for (const mat of allMaterials) {
      const { currentInventory, reorderStatus } = await calculateRawMaterialInventory(mat._id);
      if (reorderStatus === 'Out of Stock') {
        outOfStockCount++;
        lowStockList.push({
          id: mat._id,
          name: mat.name,
          sku: mat.sku,
          currentStock: currentInventory,
          reorderPoint: mat.reorderPoint,
          unit: mat.unit,
          status: 'Out of Stock'
        });
      } else if (reorderStatus === 'Low Stock') {
        lowStockCount++;
        lowStockList.push({
          id: mat._id,
          name: mat.name,
          sku: mat.sku,
          currentStock: currentInventory,
          reorderPoint: mat.reorderPoint,
          unit: mat.unit,
          status: 'Low Stock'
        });
      }
    }

    // 6. Capacity Summary & Products Ready to Manufacture
    const capacitySummaries = await getAllProductsCapacitySummary();
    const readyToManufactureCount = capacitySummaries.filter((c) => c.manufacturingCapacity > 0).length;

    // 7. Recent Orders
    const recentOrders = await Order.find()
      .populate('warehouse', 'name code')
      .populate('items.item', 'name sku unit')
      .sort({ orderDate: -1, createdAt: -1 })
      .limit(6);

    // 8. Recent Aluminium Activity
    const recentAluActivity = await AluminiumLedger.find()
      .sort({ date: -1, createdAt: -1 })
      .limit(6);

    // 9. Monthly Charts Data (Past 6 Months)
    const months = [];
    const salesMonthly = [];
    const purchasesMonthly = [];
    const transfersMonthly = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthYear = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      months.push(monthYear);

      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      // Orders for this month
      const mSales = await Order.countDocuments({
        orderType: 'SALE',
        orderDate: { $gte: startOfMonth, $lte: endOfMonth }
      });
      const mPurchases = await Order.countDocuments({
        orderType: 'PURCHASE',
        orderDate: { $gte: startOfMonth, $lte: endOfMonth }
      });
      const mTransfers = await WarehouseTransfer.countDocuments({
        transferDate: { $gte: startOfMonth, $lte: endOfMonth }
      });

      salesMonthly.push(mSales);
      purchasesMonthly.push(mPurchases);
      transfersMonthly.push(mTransfers);
    }

    // 10. Aluminium History Trend
    const recentLedger = await AluminiumLedger.find().sort({ date: 1 }).limit(30);
    const aluStockTrend = recentLedger.map((item) => ({
      date: item.date.toISOString().split('T')[0],
      balanceKg: (item.balanceGm / 1000).toFixed(2),
      balanceGm: item.balanceGm,
      type: item.transactionType
    }));

    res.status(200).json({
      success: true,
      data: {
        cards: {
          totalProducts,
          totalRawMaterials,
          todaySales: todaySalesCount,
          todayPurchases: todayPurchasesCount,
          saleOrdersTotal: saleOrdersCount,
          purchaseOrdersTotal: purchaseOrdersCount,
          lowStockMaterials: lowStockCount,
          outOfStockMaterials: outOfStockCount,
          productsReadyToManufacture: readyToManufactureCount,
          totalWarehouseTransfers: totalTransfersCount,
          pendingTransfers: pendingTransfersCount,
          aluminium: {
            availableGm: aluInventory.availableGm,
            availableKg: (aluInventory.availableGm / 1000).toFixed(2),
            purchasedGm: aluInventory.purchasedGm,
            purchasedKg: (aluInventory.purchasedGm / 1000).toFixed(2),
            usedGm: aluInventory.usedGm,
            usedKg: (aluInventory.usedGm / 1000).toFixed(2),
            wastageGm: aluInventory.wastageGm,
            wastageKg: (aluInventory.wastageGm / 1000).toFixed(2)
          },
          warehouses: warehouseStockSummary
        },
        charts: {
          months,
          monthlySales: salesMonthly,
          monthlyPurchases: purchasesMonthly,
          monthlyTransfers: transfersMonthly,
          warehouseDistribution: warehouseStockSummary.map((w) => ({
            name: w.name,
            code: w.code,
            stock: w.totalStock
          })),
          aluStockTrend
        },
        recentOrders,
        recentAluActivity,
        lowStockMaterialsList: lowStockList.slice(0, 10),
        capacityHighlights: capacitySummaries.slice(0, 8)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardData
};
