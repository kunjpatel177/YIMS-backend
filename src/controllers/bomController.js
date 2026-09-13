const BOM = require('../models/BOM');
const Product = require('../models/Product');
const RawMaterial = require('../models/RawMaterial');
const { calculateProductCapacity, getAllProductsCapacitySummary } = require('../services/bomCalculationService');

// @route   GET /api/bom
// @desc    Get all BOM entries grouped by product or flat with search and filter
// @access  Private
const getBOMs = async (req, res, next) => {
  try {
    const { productId, search, page = 1, limit = 50 } = req.query;

    const query = {};
    if (productId) query.product = productId;

    const boms = await BOM.find(query)
      .populate('product', 'name sku category')
      .populate('rawMaterial', 'name sku unit usesAluminium aluminiumRequiredPerUnit aluminiumUnit')
      .sort({ createdAt: -1 });

    // Filter by search if provided
    let filtered = boms;
    if (search) {
      const s = search.toLowerCase();
      filtered = boms.filter(
        (b) =>
          b.product?.name.toLowerCase().includes(s) ||
          b.product?.sku.toLowerCase().includes(s) ||
          b.rawMaterial?.name.toLowerCase().includes(s) ||
          b.rawMaterial?.sku.toLowerCase().includes(s)
      );
    }

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/bom/product/:productId
// @desc    Get BOM entries and capacity analysis for a specific product
// @access  Private
const getBOMByProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { warehouseId } = req.query;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const bomEntries = await BOM.find({ product: productId }).populate(
      'rawMaterial',
      'name sku unit usesAluminium aluminiumRequiredPerUnit aluminiumUnit'
    );

    const capacityAnalysis = await calculateProductCapacity(productId, warehouseId);

    res.status(200).json({
      success: true,
      data: {
        product,
        bomEntries,
        capacityAnalysis
      }
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/bom/capacity-summary
// @desc    Get bottleneck manufacturing capacity for all products ("Today's Availability")
// @access  Private
const getCapacitySummary = async (req, res, next) => {
  try {
    const summary = await getAllProductsCapacitySummary();
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/bom
// @desc    Add a raw material to a product BOM
// @access  Private
const createBOMEntry = async (req, res, next) => {
  try {
    const { product, rawMaterial, quantity, unitOfMeasure, notes } = req.body;

    const [prodDoc, rmDoc] = await Promise.all([Product.findById(product), RawMaterial.findById(rawMaterial)]);

    if (!prodDoc || !rmDoc) {
      return res.status(404).json({ success: false, message: 'Invalid product or raw material specified' });
    }

    const existing = await BOM.findOne({ product, rawMaterial });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Raw material "${rmDoc.name}" is already part of BOM for "${prodDoc.name}". Edit its quantity instead.`
      });
    }

    const bom = await BOM.create({
      product,
      rawMaterial,
      quantity: Number(quantity) || 1,
      unitOfMeasure: unitOfMeasure || rmDoc.unit || 'Pcs',
      notes: notes || ''
    });

    const populated = await BOM.findById(bom._id)
      .populate('product', 'name sku')
      .populate('rawMaterial', 'name sku unit');

    res.status(201).json({
      success: true,
      message: 'BOM item added successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/bom/:id
// @desc    Update BOM entry
// @access  Private
const updateBOMEntry = async (req, res, next) => {
  try {
    const { quantity, unitOfMeasure, notes } = req.body;
    const bom = await BOM.findById(req.params.id);

    if (!bom) {
      return res.status(404).json({ success: false, message: 'BOM entry not found' });
    }

    if (quantity !== undefined) {
      if (Number(quantity) <= 0) {
        return res.status(400).json({ success: false, message: 'Quantity must be greater than zero' });
      }
      bom.quantity = Number(quantity);
    }
    if (unitOfMeasure) bom.unitOfMeasure = unitOfMeasure;
    if (notes !== undefined) bom.notes = notes;

    await bom.save();

    const populated = await BOM.findById(bom._id)
      .populate('product', 'name sku')
      .populate('rawMaterial', 'name sku unit');

    res.status(200).json({
      success: true,
      message: 'BOM entry updated successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/bom/:id
// @desc    Delete BOM entry
// @access  Private
const deleteBOMEntry = async (req, res, next) => {
  try {
    const bom = await BOM.findById(req.params.id);
    if (!bom) {
      return res.status(404).json({ success: false, message: 'BOM entry not found' });
    }

    await bom.deleteOne();

    res.status(200).json({
      success: true,
      message: 'BOM entry deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/bom/duplicate
// @desc    Duplicate BOM from one product to another
// @access  Private
const duplicateBOM = async (req, res, next) => {
  try {
    const { sourceProductId, targetProductId } = req.body;

    if (!sourceProductId || !targetProductId) {
      return res.status(400).json({ success: false, message: 'Source and target product IDs are required' });
    }

    if (sourceProductId === targetProductId) {
      return res.status(400).json({ success: false, message: 'Source and target product cannot be the same' });
    }

    const [sourceProduct, targetProduct] = await Promise.all([
      Product.findById(sourceProductId),
      Product.findById(targetProductId)
    ]);

    if (!sourceProduct || !targetProduct) {
      return res.status(404).json({ success: false, message: 'Source or target product not found' });
    }

    const sourceBOMs = await BOM.find({ product: sourceProductId });
    if (!sourceBOMs || sourceBOMs.length === 0) {
      return res.status(400).json({ success: false, message: 'Source product has no BOM entries to copy' });
    }

    let copiedCount = 0;
    for (const item of sourceBOMs) {
      const exists = await BOM.findOne({ product: targetProductId, rawMaterial: item.rawMaterial });
      if (!exists) {
        await BOM.create({
          product: targetProductId,
          rawMaterial: item.rawMaterial,
          quantity: item.quantity,
          unitOfMeasure: item.unitOfMeasure,
          notes: item.notes ? `Copied from ${sourceProduct.name}: ${item.notes}` : `Copied from ${sourceProduct.name}`
        });
        copiedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully duplicated ${copiedCount} BOM entries to "${targetProduct.name}"`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBOMs,
  getBOMByProduct,
  getCapacitySummary,
  createBOMEntry,
  updateBOMEntry,
  deleteBOMEntry,
  duplicateBOM
};
