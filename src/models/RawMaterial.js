const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Raw material name is required'],
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
    category: {
      type: String,
      default: 'Component',
      trim: true
    },
    unit: {
      type: String,
      default: 'Pcs',
      trim: true
    },
    startingInventory: {
      type: Number,
      default: 0,
      min: [0, 'Starting inventory cannot be negative']
    },
    reorderPoint: {
      type: Number,
      default: 200,
      min: [0, 'Reorder point cannot be negative']
    },
    supplier: {
      type: String,
      default: '',
      trim: true
    },
    usesAluminium: {
      type: Boolean,
      default: false
    },
    aluminiumRequiredPerUnit: {
      type: Number,
      default: 0,
      min: [0, 'Aluminium required cannot be negative']
    },
    aluminiumUnit: {
      type: String,
      enum: ['gm', 'kg'],
      default: 'gm'
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    }
  },
  {
    timestamps: true
  }
);

rawMaterialSchema.index({ name: 'text', sku: 'text', category: 'text' });

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);
