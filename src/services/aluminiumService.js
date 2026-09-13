const AluminiumInventory = require('../models/AluminiumInventory');
const AluminiumPurchase = require('../models/AluminiumPurchase');
const AluminiumProduction = require('../models/AluminiumProduction');
const AluminiumLedger = require('../models/AluminiumLedger');
const RawMaterial = require('../models/RawMaterial');
const Warehouse = require('../models/Warehouse');
const { updateWarehouseStock, withTransaction } = require('./inventoryService');

/**
 * Get or initialize Aluminium Inventory singleton
 */
const getAluminiumInventory = async (session = null) => {
  let inv = await AluminiumInventory.findOne().session(session);
  if (!inv) {
    inv = await AluminiumInventory.create(
      [
        {
          openingStockGm: 0,
          purchasedGm: 0,
          usedGm: 0,
          wastageGm: 0,
          availableGm: 0
        }
      ],
      session ? { session } : {}
    );
    inv = inv[0];
  }
  return inv;
};

/**
 * Convert quantity and unit to grams (1 kg = 1000 gm)
 */
const convertToGrams = (quantity, unit = 'gm') => {
  const qty = Number(quantity);
  if (isNaN(qty) || qty < 0) throw new Error('Invalid quantity provided');
  if (unit === 'kg') {
    return qty * 1000;
  }
  return qty;
};

/**
 * Record Opening Aluminium Stock
 */
const setOpeningStock = async (openingGm, notes = 'Initial Opening Stock') => {
  return await withTransaction(async (session) => {
    let inv = await getAluminiumInventory(session);
    inv.openingStockGm = openingGm;
    inv.availableGm = openingGm + (inv.purchasedGm || 0) - (inv.usedGm || 0) - (inv.wastageGm || 0);
    await inv.save({ session });

    await AluminiumLedger.create(
      [
        {
          date: new Date(),
          transactionNumber: 'ALU-OPENING',
          transactionType: 'Opening Stock',
          aluminiumInGm: openingGm,
          aluminiumUsedGm: 0,
          wastageGm: 0,
          balanceGm: inv.availableGm,
          reference: 'Opening Balance',
          notes
        }
      ],
      { session }
    );

    return inv;
  });
};

/**
 * Complete an Aluminium Purchase
 */
const completeAluminiumPurchase = async (purchaseId) => {
  return await withTransaction(async (session) => {
    const purchase = await AluminiumPurchase.findById(purchaseId).session(session);
    if (!purchase) throw new Error('Aluminium purchase record not found');
    if (purchase.status === 'Completed') throw new Error('Purchase is already completed');
    if (purchase.status === 'Cancelled') throw new Error('Cannot complete a cancelled purchase');

    purchase.status = 'Completed';
    await purchase.save({ session });

    const inv = await getAluminiumInventory(session);
    inv.purchasedGm += purchase.quantityGm;
    inv.availableGm += purchase.quantityGm;
    await inv.save({ session });

    await AluminiumLedger.create(
      [
        {
          date: purchase.purchaseDate || new Date(),
          transactionNumber: purchase.purchaseNumber,
          transactionType: 'Purchase',
          aluminiumInGm: purchase.quantityGm,
          aluminiumUsedGm: 0,
          wastageGm: 0,
          balanceGm: inv.availableGm,
          reference: purchase.purchaseNumber,
          notes: purchase.notes || `Purchased from ${purchase.supplier || 'Vendor'}`
        }
      ],
      { session }
    );

    return purchase;
  });
};

/**
 * Execute Aluminium Production:
 * - Validates aluminium requirement against available stock
 * - Atomically deducts aluminium and optional wastage
 * - Creates production record and ledger entry
 * - Strictly deposits produced raw materials into Warehouse 1
 */
const executeAluminiumProduction = async ({
  rawMaterialId,
  productionQuantity,
  wastageGm = 0,
  productionDate = new Date(),
  notes = ''
}) => {
  const quantity = Number(productionQuantity);
  if (isNaN(quantity) || quantity <= 0) {
    throw new Error('Production quantity must be a positive number');
  }

  const wastage = Number(wastageGm) || 0;
  if (wastage < 0) {
    throw new Error('Wastage cannot be negative');
  }

  return await withTransaction(async (session) => {
    const material = await RawMaterial.findById(rawMaterialId).session(session);
    if (!material) throw new Error('Raw material not found');
    if (!material.usesAluminium) {
      throw new Error(`Raw material "${material.name}" is not configured to use aluminium`);
    }

    const aluPerUnitGm = convertToGrams(material.aluminiumRequiredPerUnit, material.aluminiumUnit);
    if (aluPerUnitGm <= 0) {
      throw new Error(`Raw material "${material.name}" has no valid aluminium requirement configured`);
    }

    const totalRequiredGm = quantity * aluPerUnitGm;
    const totalDeductionGm = totalRequiredGm + wastage;

    const inv = await getAluminiumInventory(session);
    if (inv.availableGm < totalDeductionGm) {
      throw new Error(
        `Insufficient Aluminium! Available: ${inv.availableGm} gm (${(inv.availableGm / 1000).toFixed(2)} kg), ` +
          `Required: ${totalDeductionGm} gm (${(totalDeductionGm / 1000).toFixed(2)} kg) including ${wastage} gm wastage.`
      );
    }

    // Warehouse 1 is strictly enforced
    let warehouse1 = await Warehouse.findOne({
      $or: [{ code: 'W1' }, { name: 'Warehouse 1' }, { isDefault: true }]
    }).session(session);

    if (!warehouse1) {
      // Fallback to first warehouse if specific code isn't found
      warehouse1 = await Warehouse.findOne().sort({ code: 1 }).session(session);
    }

    if (!warehouse1) {
      throw new Error('Warehouse 1 is required for aluminium production but could not be located');
    }

    // Update Aluminium Inventory
    inv.usedGm += totalRequiredGm;
    inv.wastageGm += wastage;
    inv.availableGm -= totalDeductionGm;
    await inv.save({ session });

    // Generate Production Number
    const count = await AluminiumProduction.countDocuments().session(session);
    const prodNumber = `PROD-ALU-${String(count + 1).padStart(5, '0')}`;

    // Create Aluminium Production Record
    const production = await AluminiumProduction.create(
      [
        {
          productionNumber: prodNumber,
          productionDate,
          rawMaterial: material._id,
          productionQuantity: quantity,
          aluminiumPerUnitGm: aluPerUnitGm,
          totalAluminiumUsedGm: totalRequiredGm,
          wastageGm: wastage,
          warehouse: warehouse1._id,
          status: 'Completed',
          notes
        }
      ],
      { session }
    );

    // Create Aluminium Ledger Entry
    await AluminiumLedger.create(
      [
        {
          date: productionDate,
          transactionNumber: prodNumber,
          transactionType: 'Production Consumption',
          aluminiumInGm: 0,
          aluminiumUsedGm: totalRequiredGm,
          wastageGm: wastage,
          balanceGm: inv.availableGm,
          reference: prodNumber,
          notes: `Produced ${quantity} ${material.unit} of ${material.name} into ${warehouse1.name}. ${notes}`
        }
      ],
      { session }
    );

    // Add produced Raw Material ONLY to Warehouse 1
    await updateWarehouseStock({
      warehouseId: warehouse1._id,
      itemType: 'RawMaterial',
      itemId: material._id,
      deltaStock: quantity,
      session
    });

    return production[0];
  });
};

module.exports = {
  getAluminiumInventory,
  convertToGrams,
  setOpeningStock,
  completeAluminiumPurchase,
  executeAluminiumProduction
};
