const AluminiumInventory = require('../models/AluminiumInventory');
const AluminiumPurchase = require('../models/AluminiumPurchase');
const AluminiumProduction = require('../models/AluminiumProduction');
const AluminiumLedger = require('../models/AluminiumLedger');
const RawMaterial = require('../models/RawMaterial');
const {
  getAluminiumInventory,
  convertToGrams,
  completeAluminiumPurchase,
  executeAluminiumProduction
} = require('../services/aluminiumService');

// @route   GET /api/aluminium/inventory
// @desc    Get current aluminium inventory balances
// @access  Private
const getInventory = async (req, res, next) => {
  try {
    const inv = await getAluminiumInventory();
    res.status(200).json({
      success: true,
      data: inv
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/aluminium/purchases
// @desc    Get aluminium purchases with pagination, filters, sorting
// @access  Private
const getPurchases = async (req, res, next) => {
  try {
    const { status, supplier, startDate, endDate, page = 1, limit = 25 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (supplier) query.supplier = { $regex: supplier, $options: 'i' };

    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) query.purchaseDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.purchaseDate.$lte = end;
      }
    }

    const total = await AluminiumPurchase.countDocuments(query);
    const purchases = await AluminiumPurchase.find(query)
      .sort({ purchaseDate: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: purchases,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/aluminium/purchases
// @desc    Create new aluminium purchase
// @access  Private
const createPurchase = async (req, res, next) => {
  try {
    const { purchaseNumber, purchaseDate, supplier, quantityInput, unitInput = 'kg', pricePerUnit, notes, autoComplete = true } =
      req.body;

    if (!quantityInput || Number(quantityInput) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid quantity is required' });
    }

    const quantityGm = convertToGrams(quantityInput, unitInput);
    const price = Number(pricePerUnit) || 0;
    const totalCost = Number(quantityInput) * price;

    let finalNumber = purchaseNumber;
    if (!finalNumber) {
      const count = await AluminiumPurchase.countDocuments();
      finalNumber = `ALU-PO-${String(count + 1).padStart(5, '0')}`;
    }

    const purchase = await AluminiumPurchase.create({
      purchaseNumber: finalNumber.trim(),
      purchaseDate: purchaseDate || new Date(),
      supplier: supplier || '',
      quantityInput: Number(quantityInput),
      unitInput: unitInput || 'kg',
      quantityGm,
      pricePerUnit: price,
      totalCost,
      status: 'Pending',
      notes: notes || ''
    });

    if (autoComplete) {
      await completeAluminiumPurchase(purchase._id);
    }

    const updated = await AluminiumPurchase.findById(purchase._id);

    res.status(201).json({
      success: true,
      message: `Aluminium purchase ${updated.purchaseNumber} recorded successfully`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/aluminium/purchases/:id/complete
// @desc    Complete pending aluminium purchase and update stock & ledger
// @access  Private
const handleCompletePurchase = async (req, res, next) => {
  try {
    const purchase = await completeAluminiumPurchase(req.params.id);
    res.status(200).json({
      success: true,
      message: `Purchase ${purchase.purchaseNumber} completed successfully`,
      data: purchase
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/aluminium/production
// @desc    Execute aluminium production: deducts aluminium & credits Warehouse 1
// @access  Private
const executeProduction = async (req, res, next) => {
  try {
    const { rawMaterialId, productionQuantity, wastageGm, productionDate, notes } = req.body;

    if (!rawMaterialId || !productionQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Raw material and production quantity are required'
      });
    }

    const production = await executeAluminiumProduction({
      rawMaterialId,
      productionQuantity,
      wastageGm: Number(wastageGm) || 0,
      productionDate: productionDate || new Date(),
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      message: `Successfully manufactured ${production.productionQuantity} units. Stock deposited into Warehouse 1.`,
      data: production
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/aluminium/productions
// @desc    Get production history with filters and pagination
// @access  Private
const getProductions = async (req, res, next) => {
  try {
    const { rawMaterialId, startDate, endDate, page = 1, limit = 25 } = req.query;

    const query = {};
    if (rawMaterialId) query.rawMaterial = rawMaterialId;

    if (startDate || endDate) {
      query.productionDate = {};
      if (startDate) query.productionDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.productionDate.$lte = end;
      }
    }

    const total = await AluminiumProduction.countDocuments(query);
    const productions = await AluminiumProduction.find(query)
      .populate('rawMaterial', 'name sku unit usesAluminium aluminiumRequiredPerUnit aluminiumUnit')
      .populate('warehouse', 'name code')
      .sort({ productionDate: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: productions,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/aluminium/ledger
// @desc    Get aluminium ledger history
// @access  Private
const getLedger = async (req, res, next) => {
  try {
    const { transactionType, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = {};
    if (transactionType) query.transactionType = transactionType;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const total = await AluminiumLedger.countDocuments(query);
    const ledger = await AluminiumLedger.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: ledger,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventory,
  getPurchases,
  createPurchase,
  handleCompletePurchase,
  executeProduction,
  getProductions,
  getLedger
};
