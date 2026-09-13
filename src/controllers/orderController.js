const Order = require('../models/Order');
const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');
const RawMaterial = require('../models/RawMaterial');
const { completeOrder, cancelOrder } = require('../services/orderService');

// @route   GET /api/orders
// @desc    Get orders by type (PURCHASE or SALE) with filters, pagination, sorting
// @access  Private
const getOrders = async (req, res, next) => {
  try {
    const {
      orderType,
      status,
      warehouseId,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 25,
      sortBy = 'orderDate',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    if (orderType) query.orderType = orderType;
    if (status) query.status = status;
    if (warehouseId) query.warehouse = warehouseId;

    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.orderDate.$lte = end;
      }
    }

    if (search) {
      query.$or = [{ orderNumber: { $regex: search, $options: 'i' } }, { partyName: { $regex: search, $options: 'i' } }];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('warehouse', 'name code')
      .populate({
        path: 'items.item',
        select: 'name sku unit'
      })
      .sort(sort)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: orders,
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

// @route   GET /api/orders/:id
// @desc    Get order details
// @access  Private
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('warehouse', 'name code address')
      .populate({
        path: 'items.item',
        select: 'name sku unit category'
      });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/orders
// @desc    Create new order (PURCHASE or SALE)
// @access  Private
const createOrder = async (req, res, next) => {
  try {
    const { orderNumber, orderType, warehouse, orderDate, expectedDate, items, partyName, notes, autoComplete } =
      req.body;

    if (!orderType || !['PURCHASE', 'SALE'].includes(orderType)) {
      return res.status(400).json({ success: false, message: 'Invalid order type' });
    }

    if (!warehouse) {
      return res.status(400).json({ success: false, message: 'Warehouse is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain at least one item' });
    }

    // Generate order number if not provided
    let finalOrderNumber = orderNumber;
    if (!finalOrderNumber) {
      const count = await Order.countDocuments({ orderType });
      const prefix = orderType === 'PURCHASE' ? 'PO' : 'SO';
      finalOrderNumber = `${prefix}-${String(count + 1).padStart(5, '0')}`;
    } else {
      const existing = await Order.findOne({ orderNumber: finalOrderNumber.trim() });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Order number already exists' });
      }
    }

    // Calculate total amount
    let totalAmount = 0;
    const validatedItems = items.map((it) => {
      const qty = Number(it.quantity) || 1;
      const price = Number(it.unitPrice) || 0;
      const total = qty * price;
      totalAmount += total;
      return {
        itemType: it.itemType || (orderType === 'PURCHASE' ? 'RawMaterial' : 'Product'),
        item: it.item,
        quantity: qty,
        unitPrice: price,
        totalPrice: total,
        notes: it.notes || ''
      };
    });

    const order = await Order.create({
      orderNumber: finalOrderNumber.trim(),
      orderType,
      warehouse,
      orderDate: orderDate || new Date(),
      expectedDate: expectedDate || null,
      items: validatedItems,
      totalAmount,
      partyName: partyName || '',
      notes: notes || '',
      status: 'Pending'
    });

    // If auto-complete requested (or immediately fulfilling)
    if (autoComplete) {
      await completeOrder(order._id);
    }

    const updated = await Order.findById(order._id)
      .populate('warehouse', 'name code')
      .populate('items.item', 'name sku unit');

    res.status(201).json({
      success: true,
      message: `Order ${updated.orderNumber} created successfully`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/orders/:id/complete
// @desc    Mark order as completed and execute inventory movements
// @access  Private
const handleCompleteOrder = async (req, res, next) => {
  try {
    const updated = await completeOrder(req.params.id);
    res.status(200).json({
      success: true,
      message: `Order ${updated.orderNumber} completed and inventory updated successfully`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/orders/:id/cancel
// @desc    Cancel a pending order
// @access  Private
const handleCancelOrder = async (req, res, next) => {
  try {
    const updated = await cancelOrder(req.params.id);
    res.status(200).json({
      success: true,
      message: `Order ${updated.orderNumber} cancelled successfully`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/orders/:id
// @desc    Delete order (only if Pending or Cancelled)
// @access  Private
const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Completed orders cannot be deleted as they have recorded inventory transactions'
      });
    }

    await order.deleteOne();
    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  handleCompleteOrder,
  handleCancelOrder,
  deleteOrder
};
