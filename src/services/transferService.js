const WarehouseTransfer = require('../models/WarehouseTransfer');
const WarehouseInventory = require('../models/WarehouseInventory');
const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');
const RawMaterial = require('../models/RawMaterial');
const { updateWarehouseStock, withTransaction } = require('./inventoryService');

/**
 * Validate transfer parameters and check source availability
 */
const validateTransfer = async (params) => {
  const sourceWarehouseId = params.sourceWarehouseId || params.sourceWarehouse;
  const destinationWarehouseId = params.destinationWarehouseId || params.destinationWarehouse;

  if (!sourceWarehouseId || !destinationWarehouseId) {
    throw new Error('Both source and destination warehouses are required');
  }

  if (sourceWarehouseId.toString() === destinationWarehouseId.toString()) {
    throw new Error('Source warehouse and destination warehouse cannot be the same');
  }

  const [srcWh, destWh] = await Promise.all([
    Warehouse.findById(sourceWarehouseId),
    Warehouse.findById(destinationWarehouseId)
  ]);

  if (!srcWh || !destWh) {
    throw new Error('Invalid source or destination warehouse specified');
  }

  // Normalise items
  let itemsToValidate = [];
  if (params.items && Array.isArray(params.items) && params.items.length > 0) {
    itemsToValidate = params.items.map((it) => ({
      itemType: it.itemType || params.itemType,
      item: it.item || it.itemId,
      quantity: Number(it.quantity)
    }));
  } else {
    itemsToValidate = [
      {
        itemType: params.itemType,
        item: params.item || params.itemId,
        quantity: Number(params.quantity)
      }
    ];
  }

  if (itemsToValidate.length === 0) {
    throw new Error('Transfer must contain at least one item');
  }

  for (const it of itemsToValidate) {
    if (!it.item) {
      throw new Error('Each transfer item line must have a valid item selected');
    }
    if (!it.quantity || it.quantity <= 0) {
      throw new Error('Transfer quantity must be greater than zero for all items');
    }

    const srcInv = await WarehouseInventory.findOne({
      warehouse: sourceWarehouseId,
      itemType: it.itemType,
      item: it.item
    });

    const available = srcInv ? Math.max(0, srcInv.currentStock - (srcInv.reservedStock || 0)) : 0;
    if (available < it.quantity) {
      const itemDoc = it.itemType === 'Product'
        ? await Product.findById(it.item)
        : await RawMaterial.findById(it.item);
      throw new Error(
        `Insufficient stock for "${itemDoc?.name || 'Item'}" in ${srcWh.name}. Available: ${available}, Requested transfer: ${it.quantity}.`
      );
    }
  }

  return { srcWh, destWh, items: itemsToValidate };
};

/**
 * Create a new transfer in Pending status
 */
const createTransfer = async (transferData) => {
  const { items: validatedItems } = await validateTransfer(transferData);

  const count = await WarehouseTransfer.countDocuments();
  const transferNumber = transferData.transferNumber || `TRF-${String(count + 1).padStart(5, '0')}`;

  const firstItem = validatedItems[0];
  const totalQuantity = validatedItems.reduce((sum, it) => sum + it.quantity, 0);

  const transfer = await WarehouseTransfer.create({
    transferNumber,
    items: validatedItems,
    // Top-level fields for backwards compatibility:
    itemType: firstItem.itemType,
    item: firstItem.item,
    quantity: totalQuantity,
    sourceWarehouse: transferData.sourceWarehouse || transferData.sourceWarehouseId,
    destinationWarehouse: transferData.destinationWarehouse || transferData.destinationWarehouseId,
    transferDate: transferData.transferDate || new Date(),
    status: 'Pending',
    notes: transferData.notes || ''
  });

  return transfer;
};

/**
 * Atomically complete a transfer:
 * Decrements source warehouse stock and increments destination warehouse stock for all items.
 */
const completeTransfer = async (transferId) => {
  return await withTransaction(async (session) => {
    const transfer = await WarehouseTransfer.findById(transferId).session(session);
    if (!transfer) throw new Error('Transfer record not found');
    if (transfer.status === 'Completed') throw new Error('Transfer is already completed');
    if (transfer.status === 'Cancelled') throw new Error('Cannot complete a cancelled transfer');

    const transferItems = (transfer.items && transfer.items.length > 0)
      ? transfer.items
      : [{ itemType: transfer.itemType, item: transfer.item, quantity: transfer.quantity }];

    // Re-validate all items inside transaction
    for (const it of transferItems) {
      const srcInv = await WarehouseInventory.findOne({
        warehouse: transfer.sourceWarehouse,
        itemType: it.itemType,
        item: it.item
      }).session(session);

      const available = srcInv ? srcInv.currentStock : 0;
      if (available < it.quantity) {
        const itemDoc = it.itemType === 'Product'
          ? await Product.findById(it.item).session(session)
          : await RawMaterial.findById(it.item).session(session);
        throw new Error(
          `Insufficient source stock to execute transfer for "${itemDoc?.name || 'Item'}". Current stock is ${available}, required is ${it.quantity}.`
        );
      }
    }

    // Shift stock atomically for each item
    for (const it of transferItems) {
      // Deduct from source warehouse
      await updateWarehouseStock({
        warehouseId: transfer.sourceWarehouse,
        itemType: it.itemType,
        itemId: it.item,
        deltaStock: -it.quantity,
        session
      });

      // Add to destination warehouse
      await updateWarehouseStock({
        warehouseId: transfer.destinationWarehouse,
        itemType: it.itemType,
        itemId: it.item,
        deltaStock: it.quantity,
        session
      });
    }

    transfer.status = 'Completed';
    await transfer.save({ session });

    return transfer;
  });
};

/**
 * Cancel a pending transfer
 */
const cancelTransfer = async (transferId) => {
  const transfer = await WarehouseTransfer.findById(transferId);
  if (!transfer) throw new Error('Transfer record not found');
  if (transfer.status === 'Completed') {
    throw new Error('Completed transfers cannot be cancelled as inventory has already shifted.');
  }

  transfer.status = 'Cancelled';
  await transfer.save();
  return transfer;
};

module.exports = {
  createTransfer,
  completeTransfer,
  cancelTransfer
};
