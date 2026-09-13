const mongoose = require('mongoose');

const aluminiumInventorySchema = new mongoose.Schema(
  {
    openingStockGm: {
      type: Number,
      default: 0,
      min: [0, 'Opening stock cannot be negative']
    },
    purchasedGm: {
      type: Number,
      default: 0,
      min: [0, 'Purchased aluminium cannot be negative']
    },
    usedGm: {
      type: Number,
      default: 0,
      min: [0, 'Used aluminium cannot be negative']
    },
    wastageGm: {
      type: Number,
      default: 0,
      min: [0, 'Wastage cannot be negative']
    },
    availableGm: {
      type: Number,
      default: 0,
      min: [0, 'Available aluminium cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('AluminiumInventory', aluminiumInventorySchema);
