const express = require('express');
const Joi = require('joi');
const Product = require('../models/Product');
const { authenticateToken, authorize, requireVerification, checkOwnership } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const createProductSchema = Joi.object({
  name: Joi.string().required().trim().max(100),
  category: Joi.string().valid('vegetables', 'fruits', 'grains', 'herbs', 'spices', 'nuts', 'legumes', 'other').required(),
  variety: Joi.string().required().trim().max(50),
  harvestDate: Joi.date().max('now').required(),
  location: Joi.object({
    name: Joi.string().required().trim(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }).required(),
    address: Joi.object({
      street: Joi.string().trim().allow(''),
      city: Joi.string().trim().allow(''),
      state: Joi.string().trim().allow(''),
      country: Joi.string().trim().allow(''),
      zipCode: Joi.string().trim().allow('')
    }).allow(null)
  }).required(),
  metadata: Joi.object({
    weight: Joi.number().min(0),
    volume: Joi.number().min(0),
    batchNumber: Joi.string().trim().allow(''),
    lotNumber: Joi.string().trim().allow(''),
    packagingType: Joi.string().trim().allow(''),
    storageConditions: Joi.string().trim().allow(''),
    shelfLife: Joi.number().min(0),
    allergens: Joi.array().items(Joi.string().trim()),
    nutritionalInfo: Joi.object({
      calories: Joi.number().min(0),
      protein: Joi.number().min(0),
      carbs: Joi.number().min(0),
      fat: Joi.number().min(0),
      fiber: Joi.number().min(0),
      sugar: Joi.number().min(0)
    }).allow(null)
  }).allow(null)
});

const updateProductSchema = Joi.object({
  name: Joi.string().trim().max(100),
  variety: Joi.string().trim().max(50),
  location: Joi.object({
    name: Joi.string().trim(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180)
    }),
    address: Joi.object({
      street: Joi.string().trim().allow(''),
      city: Joi.string().trim().allow(''),
      state: Joi.string().trim().allow(''),
      country: Joi.string().trim().allow(''),
      zipCode: Joi.string().trim().allow('')
    }).allow(null)
  }),
  metadata: Joi.object({
    weight: Joi.number().min(0),
    volume: Joi.number().min(0),
    batchNumber: Joi.string().trim().allow(''),
    lotNumber: Joi.string().trim().allow(''),
    packagingType: Joi.string().trim().allow(''),
    storageConditions: Joi.string().trim().allow(''),
    shelfLife: Joi.number().min(0),
    allergens: Joi.array().items(Joi.string().trim()),
    nutritionalInfo: Joi.object({
      calories: Joi.number().min(0),
      protein: Joi.number().min(0),
      carbs: Joi.number().min(0),
      fat: Joi.number().min(0),
      fiber: Joi.number().min(0),
      sugar: Joi.number().min(0)
    }).allow(null)
  }).allow(null)
});

const qualityCheckSchema = Joi.object({
  score: Joi.number().min(1).max(10).required(),
  notes: Joi.string().trim().required()
});

// @route   GET /api/products
// @desc    Get all products with filtering and pagination
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      farmer,
      verified,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { isActive: true };
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: [
        { path: 'farmer', select: 'firstName lastName email organization' },
        { path: 'currentOwner', select: 'firstName lastName email organization' }
      ]
    };

    // Apply filters
    if (category) query.category = category;
    if (farmer) query.farmer = farmer;
    if (verified !== undefined) query.isVerified = verified === 'true';

    // Apply search
    if (search) {
      query.$text = { $search: search };
      options.sort = { score: { $meta: 'textScore' }, ...options.sort };
    }

    const products = await Product.find(query, null, options)
      .populate('farmer', 'firstName lastName email organization')
      .populate('currentOwner', 'firstName lastName email organization');

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalProducts: total,
          hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    logger.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('farmer', 'firstName lastName email organization phone address')
      .populate('currentOwner', 'firstName lastName email organization phone address')
      .populate('supplyChain.from', 'firstName lastName email organization')
      .populate('supplyChain.to', 'firstName lastName email organization');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: { product }
    });

  } catch (error) {
    logger.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
});

// @route   POST /api/products
// @desc    Create a new product
// @access  Private (Farmers only)
router.post('/', authenticateToken, authorize('farmer'), requireVerification, async (req, res) => {
  try {
    const { error, value } = createProductSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const productData = {
      ...value,
      farmer: req.user._id,
      currentOwner: req.user._id
    };

    const product = new Product(productData);
    await product.save();

    // Populate the created product
    await product.populate('farmer', 'firstName lastName email organization');
    await product.populate('currentOwner', 'firstName lastName email organization');

    logger.info(`New product created: ${product.name} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });

  } catch (error) {
    logger.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private (Product owner or admin)
router.put('/:id', authenticateToken, checkOwnership(Product), async (req, res) => {
  try {
    const { error, value } = updateProductSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: value },
      { new: true, runValidators: true }
    )
      .populate('farmer', 'firstName lastName email organization')
      .populate('currentOwner', 'firstName lastName email organization');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    logger.info(`Product updated: ${product.name} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });

  } catch (error) {
    logger.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product'
    });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product (soft delete)
// @access  Private (Product owner or admin)
router.delete('/:id', authenticateToken, checkOwnership(Product), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    logger.info(`Product deleted: ${product.name} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    logger.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
});

// @route   POST /api/products/:id/quality-check
// @desc    Add quality check to product
// @access  Private (Inspectors only)
router.post('/:id/quality-check', authenticateToken, authorize('inspector'), async (req, res) => {
  try {
    const { error, value } = qualityCheckSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Update quality information
    product.quality = {
      score: value.score,
      notes: value.notes,
      inspector: req.user._id,
      inspectedAt: new Date()
    };

    // Auto-verify if quality score is high enough
    if (value.score >= 7) {
      product.isVerified = true;
    }

    await product.save();

    logger.info(`Quality check added to product ${product.name} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Quality check added successfully',
      data: { product }
    });

  } catch (error) {
    logger.error('Add quality check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add quality check'
    });
  }
});

// @route   GET /api/products/:id/trace
// @desc    Get product traceability information
// @access  Public
router.get('/:id/trace', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('farmer', 'firstName lastName email organization phone address')
      .populate('currentOwner', 'firstName lastName email organization phone address')
      .populate('supplyChain.from', 'firstName lastName email organization')
      .populate('supplyChain.to', 'firstName lastName email organization');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const traceabilityData = {
      product: {
        id: product._id,
        name: product.name,
        category: product.category,
        variety: product.variety,
        harvestDate: product.harvestDate,
        currentStatus: product.currentStatus,
        isVerified: product.isVerified
      },
      farmer: product.farmer,
      currentOwner: product.currentOwner,
      supplyChain: product.getSupplyChainHistory(),
      quality: product.quality,
      certifications: product.certifications,
      qrCode: product.qrCode
    };

    res.json({
      success: true,
      data: traceabilityData
    });

  } catch (error) {
    logger.error('Get traceability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch traceability data'
    });
  }
});

// @route   GET /api/products/farmer/:farmerId
// @desc    Get products by farmer
// @access  Public
router.get('/farmer/:farmerId', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const products = await Product.findByFarmer(req.params.farmerId)
      .populate('farmer', 'firstName lastName email organization')
      .populate('currentOwner', 'firstName lastName email organization');

    res.json({
      success: true,
      data: { products }
    });

  } catch (error) {
    logger.error('Get farmer products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch farmer products'
    });
  }
});

// @route   GET /api/products/search
// @desc    Search products
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q, category, verified, page = 1, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const options = {
      category,
      verified: verified === 'true' ? true : verified === 'false' ? false : undefined
    };

    const products = await Product.search(q, options);

    res.json({
      success: true,
      data: { products }
    });

  } catch (error) {
    logger.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search products'
    });
  }
});

module.exports = router;
