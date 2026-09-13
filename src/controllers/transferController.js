const WarehouseTransfer = require('../models/WarehouseTransfer');
const { createTransfer, completeTransfer, cancelTransfer } = require('../services/transferService');

// @route   GET /api/warehouse-transfers
// @desc    Get transfers with filters, search, pagination
// @access  Private
const getTransfers = async (req, res, next) => {
  try {
    const {
      status,
      sourceWarehouse,
      destinationWarehouse,
      itemType,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 25
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (sourceWarehouse) query.sourceWarehouse = sourceWarehouse;
    if (destinationWarehouse) query.destinationWarehouse = destinationWarehouse;
    if (itemType) query.itemType = itemType;

    if (startDate || endDate) {
      query.transferDate = {};
      if (startDate) query.transferDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.transferDate.$lte = end;
      }
    }

    if (search) {
      query.transferNumber = { $regex: search, $options: 'i' };
    }

    const total = await WarehouseTransfer.countDocuments(query);
    const transfers = await WarehouseTransfer.find(query)
      .populate('sourceWarehouse', 'name code')
      .populate('destinationWarehouse', 'name code')
      .populate({
        path: 'item',
        select: 'name sku unit'
      })
      .populate({
        path: 'items.item',
        select: 'name sku unit'
      })
      .sort({ transferDate: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: transfers,
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

// @route   GET /api/warehouse-transfers/:id
// @desc    Get single transfer by ID
// @access  Private
const getTransferById = async (req, res, next) => {
  try {
    const transfer = await WarehouseTransfer.findById(req.params.id)
      .populate('sourceWarehouse', 'name code address')
      .populate('destinationWarehouse', 'name code address')
      .populate('item', 'name sku unit')
      .populate('items.item', 'name sku unit');

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer not found' });
    }

    res.status(200).json({
      success: true,
      data: transfer
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/warehouse-transfers
// @desc    Initiate new transfer (creates pending or executes immediately if autoExecute=true)
// @access  Private
const handleCreateTransfer = async (req, res, next) => {
  try {
    const {
      transferNumber,
      items,
      itemType,
      itemId,
      quantity,
      sourceWarehouseId,
      destinationWarehouseId,
      transferDate,
      notes,
      autoExecute = false
    } = req.body;

    const transfer = await createTransfer({
      transferNumber,
      items,
      itemType,
      item: itemId,
      quantity: quantity ? Number(quantity) : undefined,
      sourceWarehouse: sourceWarehouseId,
      destinationWarehouse: destinationWarehouseId,
      transferDate: transferDate || new Date(),
      notes: notes || ''
    });

    if (autoExecute) {
      const completed = await completeTransfer(transfer._id);
      const populated = await WarehouseTransfer.findById(completed._id)
        .populate('sourceWarehouse', 'name code')
        .populate('destinationWarehouse', 'name code')
        .populate('item', 'name sku unit')
        .populate('items.item', 'name sku unit');

      return res.status(201).json({
        success: true,
        message: `Transfer ${populated.transferNumber} executed successfully`,
        data: populated
      });
    }

    const populated = await WarehouseTransfer.findById(transfer._id)
      .populate('sourceWarehouse', 'name code')
      .populate('destinationWarehouse', 'name code')
      .populate('item', 'name sku unit')
      .populate('items.item', 'name sku unit');

    res.status(201).json({
      success: true,
      message: `Transfer request ${populated.transferNumber} created in Pending status`,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/warehouse-transfers/:id/complete
// @desc    Execute pending transfer and shift inventory atomically
// @access  Private
const handleCompleteTransfer = async (req, res, next) => {
  try {
    const transfer = await completeTransfer(req.params.id);
    const populated = await WarehouseTransfer.findById(transfer._id)
      .populate('sourceWarehouse', 'name code')
      .populate('destinationWarehouse', 'name code')
      .populate('item', 'name sku unit')
      .populate('items.item', 'name sku unit');

    res.status(200).json({
      success: true,
      message: `Transfer ${populated.transferNumber} completed and inventory shifted successfully`,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/warehouse-transfers/:id/cancel
// @desc    Cancel pending transfer
// @access  Private
const handleCancelTransfer = async (req, res, next) => {
  try {
    const transfer = await cancelTransfer(req.params.id);
    res.status(200).json({
      success: true,
      message: `Transfer ${transfer.transferNumber} cancelled`,
      data: transfer
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransfers,
  getTransferById,
  handleCreateTransfer,
  handleCompleteTransfer,
  handleCancelTransfer
};
