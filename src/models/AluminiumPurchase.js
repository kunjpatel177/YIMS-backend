const mongoose = require('mongoose');

const aluminiumPurchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: {
      type: String,
      required: [true, 'Purchase number is required'],
      unique: true,
      trim: true
    },
    purchaseDate: {
      type: Date,
      default: Date.now
    },
    supplier: {
      type: String,
      default: '',
      trim: true
    },
    quantityInput: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.001, 'Quantity must be greater than zero']
    },
    unitInput: {
      type: String,
      enum: ['gm', 'kg'],
      default: 'kg'
    },
    quantityGm: {
      type: Number,
      required: true,
      min: [0.001, 'Quantity in grams must be greater than zero']
    },
    pricePerUnit: {
      type: Number,
      default: 0,
      min: 0
    },
    totalCost: {
      type: Number,
      default: 0,
      min: 0
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

aluminiumPurchaseSchema.index({ purchaseDate: -1 });
aluminiumPurchaseSchema.index({ status: 1 });

module.exports = mongoose.model('AluminiumPurchase', aluminiumPurchaseSchema);
