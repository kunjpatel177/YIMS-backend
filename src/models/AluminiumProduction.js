const mongoose = require('mongoose');

const aluminiumProductionSchema = new mongoose.Schema(
  {
    productionNumber: {
      type: String,
      required: [true, 'Production number is required'],
      unique: true,
      trim: true
    },
    productionDate: {
      type: Date,
      default: Date.now
    },
    rawMaterial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterial',
      required: [true, 'Raw material is required']
    },
    productionQuantity: {
      type: Number,
      required: [true, 'Production quantity is required'],
      min: [1, 'Production quantity must be at least 1']
    },
    aluminiumPerUnitGm: {
      type: Number,
      required: true,
      min: [0, 'Aluminium per unit cannot be negative']
    },
    totalAluminiumUsedGm: {
      type: Number,
      required: true,
      min: [0, 'Total aluminium used cannot be negative']
    },
    wastageGm: {
      type: Number,
      default: 0,
      min: [0, 'Wastage cannot be negative']
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Destination warehouse is required']
    },
    status: {
      type: String,
      enum: ['Completed', 'Cancelled'],
      default: 'Completed'
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

aluminiumProductionSchema.index({ productionDate: -1 });

module.exports = mongoose.model('AluminiumProduction', aluminiumProductionSchema);
