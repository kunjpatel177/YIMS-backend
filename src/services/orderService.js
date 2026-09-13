const Order = require('../models/Order');
const Product = require('../models/Product');
const RawMaterial = require('../models/RawMaterial');
const BOM = require('../models/BOM');
const WarehouseInventory = require('../models/WarehouseInventory');
const { updateWarehouseStock, withTransaction } = require('./inventoryService');

/**
 * Complete an Order (Purchase or Sale)
 */
const completeOrder = async (orderId) => {
  return await withTransaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order) throw new Error('Order not found');
    if (order.status === 'Completed') throw new Error('Order is already completed');
    if (order.status === 'Cancelled') throw new Error('Cannot complete a cancelled order');

    if (order.orderType === 'PURCHASE') {
      // Purchase orders increase Raw Material stock in destination warehouse
      for (const item of order.items) {
        if (item.itemType === 'RawMaterial') {
          await updateWarehouseStock({
            warehouseId: order.warehouse,
            itemType: 'RawMaterial',
            itemId: item.item,
            deltaStock: item.quantity,
            session
          });
        } else if (item.itemType === 'Product') {
          await updateWarehouseStock({
            warehouseId: order.warehouse,
            itemType: 'Product',
            itemId: item.item,
            deltaStock: item.quantity,
            session
          });
        }
      }
    } else if (order.orderType === 'SALE') {
      // Sale orders consume Product stock in source warehouse
      for (const item of order.items) {
        if (item.itemType === 'Product') {
          // Check product stock in the selected warehouse
          const productInv = await WarehouseInventory.findOne({
            warehouse: order.warehouse,
            itemType: 'Product',
            item: item.item
          }).session(session);

          const currentProdStock = productInv ? productInv.currentStock : 0;

          if (currentProdStock >= item.quantity) {
            // Deduct directly from finished product stock
            await updateWarehouseStock({
              warehouseId: order.warehouse,
              itemType: 'Product',
              itemId: item.item,
              deltaStock: -item.quantity,
              session
            });
          } else {
            // Check if there are BOM raw materials in this warehouse to assemble the deficit
            const deficit = item.quantity - currentProdStock;
            const bomItems = await BOM.find({ product: item.item }).session(session);

            if (bomItems && bomItems.length > 0) {
              for (const bomItem of bomItems) {
                const requiredQty = bomItem.quantity * deficit;
                const rmInv = await WarehouseInventory.findOne({
                  warehouse: order.warehouse,
                  itemType: 'RawMaterial',
                  item: bomItem.rawMaterial
                }).session(session);

                const availRm = rmInv ? rmInv.currentStock : 0;
                if (availRm < requiredQty) {
                  const rm = await RawMaterial.findById(bomItem.rawMaterial).session(session);
                  throw new Error(
                    `Insufficient stock to fulfill sale order! Insufficient raw material "${rm?.name || 'Item'}" in selected warehouse. Available: ${availRm}, Needed for assembly: ${requiredQty}.`
                  );
                }
              }

              // Consume the required raw materials for assembly
              for (const bomItem of bomItems) {
                const requiredQty = bomItem.quantity * deficit;
                await updateWarehouseStock({
                  warehouseId: order.warehouse,
                  itemType: 'RawMaterial',
                  itemId: bomItem.rawMaterial,
                  deltaStock: -requiredQty,
                  session
                });
              }

              // And deduct any available finished stock
              if (currentProdStock > 0) {
                await updateWarehouseStock({
                  warehouseId: order.warehouse,
                  itemType: 'Product',
                  itemId: item.item,
                  deltaStock: -currentProdStock,
                  session
                });
              }
            } else {
              // No BOM and insufficient stock
              throw new Error(
                `Insufficient product stock in selected warehouse! Current stock: ${currentProdStock}, requested: ${item.quantity}.`
              );
            }
          }
        } else if (item.itemType === 'RawMaterial') {
          // Direct raw material sale
          const rmInv = await WarehouseInventory.findOne({
            warehouse: order.warehouse,
            itemType: 'RawMaterial',
            item: item.item
          }).session(session);

          const currentRmStock = rmInv ? rmInv.currentStock : 0;
          if (currentRmStock < item.quantity) {
            const rmDoc = await RawMaterial.findById(item.item).session(session);
            throw new Error(
              `Insufficient raw material stock in selected warehouse for "${rmDoc?.name || 'Raw Material'}"! Available: ${currentRmStock}, requested: ${item.quantity}.`
            );
          }

          await updateWarehouseStock({
            warehouseId: order.warehouse,
            itemType: 'RawMaterial',
            itemId: item.item,
            deltaStock: -item.quantity,
            session
          });
        }
      }
    }

    order.status = 'Completed';
    await order.save({ session });
    return order;
  });
};

/**
 * Cancel an Order
 */
const cancelOrder = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');
  if (order.status === 'Completed') {
    throw new Error('Completed orders cannot be cancelled directly as inventory has already been modified.');
  }
  order.status = 'Cancelled';
  await order.save();
  return order;
};

module.exports = {
  completeOrder,
  cancelOrder
};
