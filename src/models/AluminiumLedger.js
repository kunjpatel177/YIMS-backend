const mongoose = require('mongoose');

const aluminiumLedgerSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      default: Date.now
    },
    transactionNumber: {
      type: String,
      required: true,
      trim: true
    },
    transactionType: {
      type: String,
      enum: ['Opening Stock', 'Purchase', 'Production Consumption', 'Wastage/Scrap', 'Adjustment'],
      required: true
    },
    aluminiumInGm: {
      type: Number,
      default: 0,
      min: 0
    },
    aluminiumUsedGm: {
      type: Number,
      default: 0,
      min: 0
    },
    wastageGm: {
      type: Number,
      default: 0,
      min: 0
    },
    balanceGm: {
      type: Number,
      required: true,
      min: [0, 'Balance cannot be negative']
    },
    reference: {
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

aluminiumLedgerSchema.index({ date: -1 });
aluminiumLedgerSchema.index({ transactionType: 1 });

module.exports = mongoose.model('AluminiumLedger', aluminiumLedgerSchema);
