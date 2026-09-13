const Warehouse = require('../models/Warehouse');

// @route   GET /api/warehouses
// @desc    Get all warehouses
// @access  Private
const getWarehouses = async (req, res, next) => {
  try {
    const warehouses = await Warehouse.find().sort({ code: 1 });
    res.status(200).json({
      success: true,
      data: warehouses
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/warehouses/:id
// @desc    Get warehouse by ID
// @access  Private
const getWarehouseById = async (req, res, next) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }
    res.status(200).json({
      success: true,
      data: warehouse
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/warehouses
// @desc    Create new warehouse
// @access  Private
const createWarehouse = async (req, res, next) => {
  try {
    const { name, code, address, status, isDefault } = req.body;

    const existing = await Warehouse.findOne({
      $or: [{ name: name.trim() }, { code: code.trim().toUpperCase() }]
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Warehouse with this name or code already exists' });
    }

    const warehouse = await Warehouse.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      address: address || '',
      status: status || 'Active',
      isDefault: Boolean(isDefault)
    });

    res.status(201).json({
      success: true,
      message: 'Warehouse created successfully',
      data: warehouse
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/warehouses/:id
// @desc    Update warehouse
// @access  Private
const updateWarehouse = async (req, res, next) => {
  try {
    const { name, code, address, status, isDefault } = req.body;
    const warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    if (name) warehouse.name = name.trim();
    if (code) warehouse.code = code.trim().toUpperCase();
    if (address !== undefined) warehouse.address = address;
    if (status) warehouse.status = status;
    if (isDefault !== undefined) warehouse.isDefault = Boolean(isDefault);

    await warehouse.save();

    res.status(200).json({
      success: true,
      message: 'Warehouse updated successfully',
      data: warehouse
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse
};
