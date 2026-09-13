const Product = require('../models/Product');
const BOM = require('../models/BOM');
const Order = require('../models/Order');
const WarehouseInventory = require('../models/WarehouseInventory');
const { calculateProductSalesAndStock, getItemWarehouseStocks } = require('../services/inventoryService');
const { calculateProductCapacity } = require('../services/bomCalculationService');

// @route   GET /api/products
// @desc    Get all products with pagination, search, category filter and calculated stock/sales
// @access  Private
const getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 25, search = '', category = '', status = '', sortBy = 'name', sortOrder = 'asc' } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;
    if (status) query.status = status;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sort)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    // Enhance each product with dynamic sales quantity and total stock
    const enhancedProducts = await Promise.all(
      products.map(async (prod) => {
        const stats = await calculateProductSalesAndStock(prod._id);
        const capacityInfo = await calculateProductCapacity(prod._id);
        return {
          ...prod.toObject(),
          salesQuantity: stats.salesQuantity,
          totalStock: stats.totalStock,
          totalAvailable: stats.totalAvailable,
          warehouseStocks: stats.warehouseStocks,
          manufacturingCapacity: capacityInfo.capacity,
          bottleneckMaterial: capacityInfo.bottleneckMaterial,
          hasBOM: capacityInfo.hasBOM
        };
      })
    );

    // Get unique categories for filtering
    const categories = await Product.distinct('category');

    res.status(200).json({
      success: true,
      data: enhancedProducts,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      },
      categories
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/products/:id
// @desc    Get product details with BOM and warehouse stocks
// @access  Private
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const stats = await calculateProductSalesAndStock(product._id);
    const capacityInfo = await calculateProductCapacity(product._id);
    const bomEntries = await BOM.find({ product: product._id }).populate('rawMaterial');

    res.status(200).json({
      success: true,
      data: {
        ...product.toObject(),
        salesQuantity: stats.salesQuantity,
        totalStock: stats.totalStock,
        totalAvailable: stats.totalAvailable,
        warehouseStocks: stats.warehouseStocks,
        capacityInfo,
        bomEntries
      }
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/products
// @desc    Create new product
// @access  Private
const createProduct = async (req, res, next) => {
  try {
    const { name, sku, description, category, unit, status, reorderPoint } = req.body;

    // Check duplicate name or sku
    const existing = await Product.findOne({
      $or: [{ name: { $regex: `^${name.trim()}$`, $options: 'i' } }, { sku: sku.trim().toUpperCase() }]
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A product with this name or SKU already exists'
      });
    }

    const product = await Product.create({
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      description: description || '',
      category: category || 'LED Fixture',
      unit: unit || 'Pcs',
      status: status || 'Active',
      reorderPoint: Number(reorderPoint) || 50
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private
const updateProduct = async (req, res, next) => {
  try {
    const { name, sku, description, category, unit, status, reorderPoint } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check duplicate on name/sku
    if (name || sku) {
      const existing = await Product.findOne({
        _id: { $ne: product._id },
        $or: [
          ...(name ? [{ name: { $regex: `^${name.trim()}$`, $options: 'i' } }] : []),
          ...(sku ? [{ sku: sku.trim().toUpperCase() }] : [])
        ]
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Another product with this name or SKU already exists'
        });
      }
    }

    if (name) product.name = name.trim();
    if (sku) product.sku = sku.trim().toUpperCase();
    if (description !== undefined) product.description = description;
    if (category) product.category = category;
    if (unit) product.unit = unit;
    if (status) product.status = status;
    if (reorderPoint !== undefined) product.reorderPoint = Number(reorderPoint);

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/products/:id
// @desc    Delete product (prevented if referenced in BOM or Orders)
// @access  Private
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check BOM reference
    const bomCount = await BOM.countDocuments({ product: product._id });
    if (bomCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete "${product.name}" because it is referenced in Bill of Materials (${bomCount} component entries)`
      });
    }

    // Check Order reference
    const orderCount = await Order.countDocuments({
      'items.itemType': 'Product',
      'items.item': product._id
    });
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete "${product.name}" because it is referenced in ${orderCount} order transaction(s)`
      });
    }

    // Check Inventory balance
    const invRecords = await WarehouseInventory.find({
      itemType: 'Product',
      item: product._id,
      currentStock: { $gt: 0 }
    });
    if (invRecords.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete "${product.name}" because warehouse inventory exists for it`
      });
    }

    // Remove empty inventory documents
    await WarehouseInventory.deleteMany({ itemType: 'Product', item: product._id });
    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
