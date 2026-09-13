const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      unique: true,
      trim: true
    },
    sku: {
      type: String,
      required: [true, 'SKU / Unique code is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    category: {
      type: String,
      default: 'LED Fixture',
      trim: true
    },
    unit: {
      type: String,
      default: 'Pcs',
      trim: true
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    },
    reorderPoint: {
      type: Number,
      default: 50,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

productSchema.index({ name: 'text', sku: 'text', category: 'text' });

module.exports = mongoose.model('Product', productSchema);
