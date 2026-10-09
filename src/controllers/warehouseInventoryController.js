const WarehouseInventory = require('../models/WarehouseInventory');
const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');
const RawMaterial = require('../models/RawMaterial');

// @route   GET /api/warehouse-inventory
// @desc    Get inventory items for a specific warehouse or across all warehouses
// @access  Private
const getWarehouseInventory = async (req, res, next) => {
  try {
    const { warehouseId, itemType, search, page = 1, limit = 50 } = req.query;

    const query = {};
    if (warehouseId) query.warehouse = warehouseId;
    if (itemType) query.itemType = itemType;

    const inventories = await WarehouseInventory.find(query)
      .populate('warehouse', 'name code')
      .populate({
        path: 'item',
        select: 'name sku category unit reorderPoint'
      })
      .sort({ updatedAt: -1 })
      .lean();

    let filtered = inventories.filter((inv) => inv.item != null);

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.item?.name?.toLowerCase().includes(s) ||
          inv.item?.sku?.toLowerCase().includes(s) ||
          inv.item?.category?.toLowerCase().includes(s)
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit));

    res.status(200).json({
      success: true,
      data: paginated,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/warehouse-inventory/summary
// @desc    Get total stock summary grouped by warehouse
// @access  Private
const getWarehouseInventorySummary = async (req, res, next) => {
  try {
    const [warehouses, agg] = await Promise.all([
      Warehouse.find({ status: 'Active' }).sort({ code: 1 }).lean(),
      WarehouseInventory.aggregate([
        {
          $group: {
            _id: { warehouse: '$warehouse', itemType: '$itemType' },
            totalStock: { $sum: '$currentStock' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const statsByWh = new Map();
    for (const row of agg) {
      const whKey = row._id.warehouse.toString();
      if (!statsByWh.has(whKey)) {
        statsByWh.set(whKey, { productStock: 0, materialStock: 0, distinctCount: 0 });
      }
      const entry = statsByWh.get(whKey);
      if (row._id.itemType === 'Product') {
        entry.productStock += row.totalStock || 0;
      } else if (row._id.itemType === 'RawMaterial') {
        entry.materialStock += row.totalStock || 0;
      }
      entry.distinctCount += row.count || 0;
    }

    const summary = warehouses.map((wh) => {
      const s = statsByWh.get(wh._id.toString()) || { productStock: 0, materialStock: 0, distinctCount: 0 };
      return {
        warehouseId: wh._id,
        name: wh.name,
        code: wh.code,
        address: wh.address,
        totalProductsStock: s.productStock,
        totalRawMaterialsStock: s.materialStock,
        totalUnits: s.productStock + s.materialStock,
        distinctItemsCount: s.distinctCount
      };
    });

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWarehouseInventory,
  getWarehouseInventorySummary
};
