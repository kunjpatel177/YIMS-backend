const mongoose = require('mongoose');

const bomSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required']
    },
    rawMaterial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterial',
      required: [true, 'Raw material reference is required']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.0001, 'Quantity must be greater than zero'],
      default: 1
    },
    unitOfMeasure: {
      type: String,
      default: 'Pcs',
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

// Prevent duplicate raw material entries for the same product
bomSchema.index({ product: 1, rawMaterial: 1 }, { unique: true });

module.exports = mongoose.model('BOM', bomSchema);
