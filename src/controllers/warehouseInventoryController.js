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
      .sort({ updatedAt: -1 });

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
    const warehouses = await Warehouse.find({ status: 'Active' }).sort({ code: 1 });

    const summary = await Promise.all(
      warehouses.map(async (wh) => {
        const items = await WarehouseInventory.find({ warehouse: wh._id });
        const productCount = items.filter((i) => i.itemType === 'Product').reduce((sum, i) => sum + i.currentStock, 0);
        const materialCount = items
          .filter((i) => i.itemType === 'RawMaterial')
          .reduce((sum, i) => sum + i.currentStock, 0);

        return {
          warehouseId: wh._id,
          name: wh.name,
          code: wh.code,
          address: wh.address,
          totalProductsStock: productCount,
          totalRawMaterialsStock: materialCount,
          totalUnits: productCount + materialCount,
          distinctItemsCount: items.length
        };
      })
    );

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
