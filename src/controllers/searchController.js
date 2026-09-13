const Product = require('../models/Product');
const RawMaterial = require('../models/RawMaterial');
const Order = require('../models/Order');
const Warehouse = require('../models/Warehouse');
const AluminiumPurchase = require('../models/AluminiumPurchase');
const AluminiumProduction = require('../models/AluminiumProduction');

// @route   GET /api/search
// @desc    Global search across all modules
// @access  Private
const globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(200).json({ success: true, data: { products: [], rawMaterials: [], orders: [], aluminium: [] } });
    }

    const regex = { $regex: q.trim(), $options: 'i' };

    const [products, rawMaterials, orders, aluPurchases, aluProductions] = await Promise.all([
      Product.find({
        $or: [{ name: regex }, { sku: regex }, { category: regex }]
      })
        .limit(6)
        .select('name sku category unit'),

      RawMaterial.find({
        $or: [{ name: regex }, { sku: regex }, { supplier: regex }]
      })
        .limit(6)
        .select('name sku unit category usesAluminium'),

      Order.find({
        $or: [{ orderNumber: regex }, { partyName: regex }]
      })
        .limit(6)
        .populate('warehouse', 'name')
        .select('orderNumber orderType orderDate status totalAmount partyName'),

      AluminiumPurchase.find({
        $or: [{ purchaseNumber: regex }, { supplier: regex }]
      })
        .limit(4)
        .select('purchaseNumber supplier quantityInput unitInput status purchaseDate'),

      AluminiumProduction.find({
        productionNumber: regex
      })
        .limit(4)
        .populate('rawMaterial', 'name')
        .select('productionNumber productionQuantity rawMaterial productionDate')
    ]);

    res.status(200).json({
      success: true,
      data: {
        products,
        rawMaterials,
        orders,
        aluminium: [
          ...aluPurchases.map((p) => ({ ...p.toObject(), type: 'Purchase' })),
          ...aluProductions.map((p) => ({ ...p.toObject(), type: 'Production' }))
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { globalSearch };
