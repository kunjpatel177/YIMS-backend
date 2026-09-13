const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'Yashvee LED Lighting Pvt. Ltd.',
      trim: true
    },
    companyEmail: {
      type: String,
      default: 'contact@yashvee.com',
      trim: true
    },
    companyPhone: {
      type: String,
      default: '+91 98765 43210',
      trim: true
    },
    companyAddress: {
      type: String,
      default: 'Phase II, GIDC Industrial Estate, Gujarat, India',
      trim: true
    },
    defaultCurrency: {
      type: String,
      default: 'INR (₹)',
      trim: true
    },
    defaultWeightUnit: {
      type: String,
      default: 'gm',
      enum: ['gm', 'kg']
    },
    defaultReorderPoint: {
      type: Number,
      default: 200
    },
    lowStockThresholdPercent: {
      type: Number,
      default: 20
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Settings', settingsSchema);
