const Product = require('../models/Product');
const RawMaterial = require('../models/RawMaterial');
const Order = require('../models/Order');
const Warehouse = require('../models/Warehouse');
const WarehouseInventory = require('../models/WarehouseInventory');
const WarehouseTransfer = require('../models/WarehouseTransfer');
const BOM = require('../models/BOM');
const AluminiumLedger = require('../models/AluminiumLedger');
const { getAluminiumInventory } = require('../services/aluminiumService');

// @route   GET /api/dashboard
// @desc    Get all aggregated metrics, KPI cards, charts, and recent activity
// @access  Private
const getDashboardData = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build 6-month window boundaries in local time
    const monthBuckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      monthBuckets.push({
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        start: startOfMonth,
        end: endOfMonth,
        sales: 0,
        purchases: 0,
        transfers: 0
      });
    }
    const sixMonthsStart = monthBuckets[0].start;

    // Execute all DB reads in a single parallel batch instead of sequential loops
    const [
      activeProducts,
      allMaterials,
      warehouses,
      allInventories,
      allBOMs,
      aluInventory,
      saleOrdersCount,
      purchaseOrdersCount,
      pendingTransfersCount,
      totalTransfersCount,
      recentSixMonthOrders,
      recentSixMonthTransfers,
      recentOrders,
      recentAluActivity,
      recentLedger
    ] = await Promise.all([
      Product.find({ status: 'Active' }).sort({ name: 1 }).lean(),
      RawMaterial.find({ status: 'Active' }).lean(),
      Warehouse.find({ status: 'Active' }).sort({ code: 1 }).lean(),
      WarehouseInventory.find().lean(),
      BOM.find().populate('rawMaterial', 'name sku unit').lean(),
      getAluminiumInventory(),
      Order.countDocuments({ orderType: 'SALE' }),
      Order.countDocuments({ orderType: 'PURCHASE' }),
      WarehouseTransfer.countDocuments({ status: 'Pending' }),
      WarehouseTransfer.countDocuments(),
      Order.find({ orderDate: { $gte: sixMonthsStart } }).select('orderType orderDate').lean(),
      WarehouseTransfer.find({ transferDate: { $gte: sixMonthsStart } }).select('transferDate').lean(),
      Order.find()
        .populate('warehouse', 'name code')
        .populate('items.item', 'name sku unit')
        .sort({ orderDate: -1, createdAt: -1 })
        .limit(6)
        .lean(),
      AluminiumLedger.find().sort({ date: -1, createdAt: -1 }).limit(6).lean(),
      AluminiumLedger.find().sort({ date: 1 }).limit(30).lean()
    ]);

    const totalProducts = activeProducts.length;
    const totalRawMaterials = allMaterials.length;

    // Today's Transactions & 6-Month Order Charts
    let todaySalesCount = 0;
    let todayPurchasesCount = 0;

    for (const ord of recentSixMonthOrders) {
      const oDate = new Date(ord.orderDate);
      if (oDate >= today) {
        if (ord.orderType === 'SALE') todaySalesCount++;
        else if (ord.orderType === 'PURCHASE') todayPurchasesCount++;
      }
      for (const b of monthBuckets) {
        if (oDate >= b.start && oDate <= b.end) {
          if (ord.orderType === 'SALE') b.sales++;
          else if (ord.orderType === 'PURCHASE') b.purchases++;
          break;
        }
      }
    }

    for (const trf of recentSixMonthTransfers) {
      const tDate = new Date(trf.transferDate);
      for (const b of monthBuckets) {
        if (tDate >= b.start && tDate <= b.end) {
          b.transfers++;
          break;
        }
      }
    }

    // Index inventories by warehouse and by item for active warehouses
    const activeWhSet = new Set(warehouses.map((w) => w._id.toString()));
    const whProdStockMap = new Map();
    const whRmStockMap = new Map();
    const rmTotalStockMap = new Map();
    const rmAvailableStockMap = new Map();
    const prodTotalStockMap = new Map();

    for (const inv of allInventories) {
      const whKey = inv.warehouse.toString();
      if (!activeWhSet.has(whKey)) continue;

      const itemKey = inv.item.toString();
      const current = inv.currentStock || 0;
      const reserved = inv.reservedStock || 0;
      const avail = Math.max(0, current - reserved);

      if (inv.itemType === 'Product') {
        whProdStockMap.set(whKey, (whProdStockMap.get(whKey) || 0) + current);
        prodTotalStockMap.set(itemKey, (prodTotalStockMap.get(itemKey) || 0) + current);
      } else if (inv.itemType === 'RawMaterial') {
        whRmStockMap.set(whKey, (whRmStockMap.get(whKey) || 0) + current);
        rmTotalStockMap.set(itemKey, (rmTotalStockMap.get(itemKey) || 0) + current);
        rmAvailableStockMap.set(itemKey, (rmAvailableStockMap.get(itemKey) || 0) + avail);
      }
    }

    // 4. Warehouse-wise Stock
    const warehouseStockSummary = warehouses.map((wh) => {
      const whKey = wh._id.toString();
      const prodStock = whProdStockMap.get(whKey) || 0;
      const rmStock = whRmStockMap.get(whKey) || 0;
      return {
        warehouseId: wh._id,
        name: wh.name,
        code: wh.code,
        productStock: prodStock,
        rawMaterialStock: rmStock,
        totalStock: prodStock + rmStock
      };
    });

    // 5. Raw Materials Health Check
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockList = [];

    for (const mat of allMaterials) {
      const currentInventory = rmTotalStockMap.get(mat._id.toString()) || 0;
      if (currentInventory === 0) {
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
      } else if (currentInventory <= mat.reorderPoint) {
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
    const bomByProduct = new Map();
    for (const entry of allBOMs) {
      if (!entry.rawMaterial || !entry.product) continue;
      const prodKey = entry.product.toString();
      if (!bomByProduct.has(prodKey)) {
        bomByProduct.set(prodKey, []);
      }
      bomByProduct.get(prodKey).push(entry);
    }

    const capacitySummaries = activeProducts.map((prod) => {
      const prodKey = prod._id.toString();
      const entries = bomByProduct.get(prodKey) || [];
      const finishedStock = prodTotalStockMap.get(prodKey) || 0;

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
        const availableStock = rmAvailableStockMap.get(rm._id.toString()) || 0;
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

    const readyToManufactureCount = capacitySummaries.filter((c) => c.manufacturingCapacity > 0).length;

    // 10. Aluminium History Trend
    const aluStockTrend = recentLedger.map((item) => ({
      date: new Date(item.date).toISOString().split('T')[0],
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
          months: monthBuckets.map((b) => b.label),
          monthlySales: monthBuckets.map((b) => b.sales),
          monthlyPurchases: monthBuckets.map((b) => b.purchases),
          monthlyTransfers: monthBuckets.map((b) => b.transfers),
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
