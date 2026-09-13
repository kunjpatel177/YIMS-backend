const RawMaterial = require('../models/RawMaterial');
const BOM = require('../models/BOM');
const Order = require('../models/Order');
const AluminiumProduction = require('../models/AluminiumProduction');
const WarehouseInventory = require('../models/WarehouseInventory');
const WarehouseTransfer = require('../models/WarehouseTransfer');
const { calculateRawMaterialInventory } = require('../services/inventoryService');

// @route   GET /api/raw-materials
// @desc    Get raw materials with dynamic stock, reorder status, pagination, filter
// @access  Private
const getRawMaterials = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 25,
      search = '',
      category = '',
      status = '',
      reorderFilter = '',
      usesAluminium = '',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;
    if (status) query.status = status;
    if (usesAluminium !== '') query.usesAluminium = usesAluminium === 'true';

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const total = await RawMaterial.countDocuments(query);
    const materials = await RawMaterial.find(query)
      .sort(sort)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    // Calculate dynamic inventory, purchases, production output, and reorder status
    let enhancedMaterials = await Promise.all(
      materials.map(async (mat) => {
        const invData = await calculateRawMaterialInventory(mat._id);
        return {
          ...mat.toObject(),
          currentInventory: invData.currentInventory,
          purchasedQuantity: invData.purchasedQuantity,
          productionOutput: invData.productionOutput,
          reorderStatus: invData.reorderStatus,
          warehouseStocks: invData.warehouseStocks
        };
      })
    );

    if (reorderFilter) {
      enhancedMaterials = enhancedMaterials.filter((m) => m.reorderStatus === reorderFilter);
    }

    const categories = await RawMaterial.distinct('category');

    res.status(200).json({
      success: true,
      data: enhancedMaterials,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      },
      categories
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/raw-materials/:id
// @desc    Get single raw material details with full transaction history and breakdown
// @access  Private
const getRawMaterialById = async (req, res, next) => {
  try {
    const material = await RawMaterial.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Raw material not found' });
    }

    const invData = await calculateRawMaterialInventory(material._id);
    const usedInBOM = await BOM.find({ rawMaterial: material._id }).populate('product', 'name sku');

    // Recent orders
    const recentOrders = await Order.find({
      'items.itemType': 'RawMaterial',
      'items.item': material._id
    })
      .sort({ orderDate: -1 })
      .limit(10);

    // Recent aluminium productions
    const recentProductions = await AluminiumProduction.find({
      rawMaterial: material._id
    })
      .sort({ productionDate: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        ...material.toObject(),
        ...invData,
        usedInBOM,
        recentOrders,
        recentProductions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/raw-materials
// @desc    Create new raw material
// @access  Private
const createRawMaterial = async (req, res, next) => {
  try {
    const {
      name,
      sku,
      category,
      unit,
      startingInventory = 0,
      reorderPoint = 200,
      supplier,
      usesAluminium = false,
      aluminiumRequiredPerUnit = 0,
      aluminiumUnit = 'gm'
    } = req.body;

    const existing = await RawMaterial.findOne({
      $or: [{ name: { $regex: `^${name.trim()}$`, $options: 'i' } }, { sku: sku.trim().toUpperCase() }]
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A raw material with this name or SKU already exists'
      });
    }

    const material = await RawMaterial.create({
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      category: category || 'Component',
      unit: unit || 'Pcs',
      startingInventory: Number(startingInventory) || 0,
      reorderPoint: Number(reorderPoint) || 200,
      supplier: supplier ? supplier.trim() : '',
      usesAluminium: Boolean(usesAluminium),
      aluminiumRequiredPerUnit: Number(aluminiumRequiredPerUnit) || 0,
      aluminiumUnit: aluminiumUnit || 'gm'
    });

    // If starting inventory > 0, allocate to default warehouse (Warehouse 1)
    if (Number(startingInventory) > 0) {
      const Warehouse = require('../models/Warehouse');
      let wh1 = await Warehouse.findOne({ $or: [{ code: 'W1' }, { isDefault: true }] });
      if (!wh1) wh1 = await Warehouse.findOne().sort({ code: 1 });
      if (wh1) {
        await WarehouseInventory.create({
          warehouse: wh1._id,
          itemType: 'RawMaterial',
          item: material._id,
          currentStock: Number(startingInventory)
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Raw material created successfully',
      data: material
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/raw-materials/:id
// @desc    Update raw material details
// @access  Private
const updateRawMaterial = async (req, res, next) => {
  try {
    const {
      name,
      sku,
      category,
      unit,
      reorderPoint,
      supplier,
      usesAluminium,
      aluminiumRequiredPerUnit,
      aluminiumUnit,
      status
    } = req.body;

    const material = await RawMaterial.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Raw material not found' });
    }

    // Check duplicate
    if (name || sku) {
      const existing = await RawMaterial.findOne({
        _id: { $ne: material._id },
        $or: [
          ...(name ? [{ name: { $regex: `^${name.trim()}$`, $options: 'i' } }] : []),
          ...(sku ? [{ sku: sku.trim().toUpperCase() }] : [])
        ]
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Another raw material with this name or SKU already exists'
        });
      }
    }

    if (name) material.name = name.trim();
    if (sku) material.sku = sku.trim().toUpperCase();
    if (category) material.category = category;
    if (unit) material.unit = unit;
    if (reorderPoint !== undefined) material.reorderPoint = Number(reorderPoint);
    if (supplier !== undefined) material.supplier = supplier.trim();
    if (usesAluminium !== undefined) material.usesAluminium = Boolean(usesAluminium);
    if (aluminiumRequiredPerUnit !== undefined)
      material.aluminiumRequiredPerUnit = Number(aluminiumRequiredPerUnit);
    if (aluminiumUnit) material.aluminiumUnit = aluminiumUnit;
    if (status) material.status = status;

    await material.save();

    res.status(200).json({
      success: true,
      message: 'Raw material updated successfully',
      data: material
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/raw-materials/:id
// @desc    Delete raw material (prevented if referenced)
// @access  Private
const deleteRawMaterial = async (req, res, next) => {
  try {
    const material = await RawMaterial.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Raw material not found' });
    }

    // Check BOM reference
    const bomCount = await BOM.countDocuments({ rawMaterial: material._id });
    if (bomCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete "${material.name}" because it is referenced in ${bomCount} Bill of Materials records`
      });
    }

    // Check Orders
    const orderCount = await Order.countDocuments({
      'items.itemType': 'RawMaterial',
      'items.item': material._id
    });
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete "${material.name}" because it is referenced in ${orderCount} order transactions`
      });
    }

    // Check Aluminium Production
    const prodCount = await AluminiumProduction.countDocuments({ rawMaterial: material._id });
    if (prodCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete "${material.name}" because it is referenced in ${prodCount} aluminium production records`
      });
    }

    // Check Inventory
    const invRecords = await WarehouseInventory.find({
      itemType: 'RawMaterial',
      item: material._id,
      currentStock: { $gt: 0 }
    });
    if (invRecords.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete "${material.name}" because active warehouse stock exists`
      });
    }

    await WarehouseInventory.deleteMany({ itemType: 'RawMaterial', item: material._id });
    await material.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Raw material deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRawMaterials,
  getRawMaterialById,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial
};
