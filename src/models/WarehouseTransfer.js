const mongoose = require('mongoose');

const transferItemSchema = new mongoose.Schema(
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
    }
  },
  { _id: true }
);

const warehouseTransferSchema = new mongoose.Schema(
  {
    transferNumber: {
      type: String,
      required: [true, 'Transfer number is required'],
      unique: true,
      trim: true
    },
    // Multi-item support
    items: [transferItemSchema],

    // Top-level fields for backwards compatibility with single-item transfers
    itemType: {
      type: String,
      enum: ['Product', 'RawMaterial']
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'itemType'
    },
    quantity: {
      type: Number
    },
    sourceWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Source warehouse is required']
    },
    destinationWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Destination warehouse is required']
    },
    transferDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Cancelled'],
      default: 'Pending'
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

warehouseTransferSchema.index({ transferDate: -1 });
warehouseTransferSchema.index({ status: 1 });

module.exports = mongoose.model('WarehouseTransfer', warehouseTransferSchema);
