const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: ['Product', 'RawMaterial'],
      required: true
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'items.itemType'
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    unitPrice: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPrice: {
      type: Number,
      default: 0,
      min: 0
    },
    notes: {
      type: String,
      default: '',
      trim: true
    }
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      trim: true
    },
    orderType: {
      type: String,
      enum: ['PURCHASE', 'SALE'],
      required: [true, 'Order type is required']
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Warehouse reference is required']
    },
    orderDate: {
      type: Date,
      default: Date.now
    },
    expectedDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Cancelled'],
      default: 'Pending'
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    partyName: {
      type: String,
      default: '',
      trim: true
    },
    notes: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

orderSchema.index({ orderType: 1, status: 1 });
orderSchema.index({ orderDate: -1 });

module.exports = mongoose.model('Order', orderSchema);
