const mongoose = require('mongoose');

const warehouseInventorySchema = new mongoose.Schema(
  {
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Warehouse reference is required']
    },
    itemType: {
      type: String,
      enum: ['Product', 'RawMaterial'],
      required: [true, 'Item type is required']
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Item reference is required'],
      refPath: 'itemType'
    },
    currentStock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative']
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: [0, 'Reserved stock cannot be negative']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

warehouseInventorySchema.virtual('availableStock').get(function () {
  return Math.max(0, (this.currentStock || 0) - (this.reservedStock || 0));
});

// Ensure only one inventory record per item per warehouse
warehouseInventorySchema.index({ warehouse: 1, itemType: 1, item: 1 }, { unique: true });

module.exports = mongoose.model('WarehouseInventory', warehouseInventorySchema);
