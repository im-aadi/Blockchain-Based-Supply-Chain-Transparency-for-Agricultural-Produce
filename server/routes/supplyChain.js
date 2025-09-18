const express = require('express');
const Joi = require('joi');
const Product = require('../models/Product');
const { authenticateToken, authorize, requireVerification } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const transferProductSchema = Joi.object({
  productId: Joi.string().required(),
  toUserId: Joi.string().required(),
  toStatus: Joi.string().valid('processed', 'packaged', 'in-transit', 'at-warehouse', 'at-retailer', 'delivered', 'consumed').required(),
  location: Joi.string().required().trim(),
  notes: Joi.string().trim().allow(''),
  temperature: Joi.number().min(-50).max(60).allow(null),
  humidity: Joi.number().min(0).max(100).allow(null)
});

const updateStatusSchema = Joi.object({
  productId: Joi.string().required(),
  newStatus: Joi.string().valid('harvested', 'processed', 'packaged', 'in-transit', 'at-warehouse', 'at-retailer', 'delivered', 'consumed').required(),
  location: Joi.string().required().trim(),
  notes: Joi.string().trim().allow(''),
  temperature: Joi.number().min(-50).max(60).allow(null),
  humidity: Joi.number().min(0).max(100).allow(null)
});

// @route   POST /api/supply-chain/transfer
// @desc    Transfer product ownership in supply chain
// @access  Private
router.post('/transfer', authenticateToken, requireVerification, async (req, res) => {
  try {
    const { error, value } = transferProductSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { productId, toUserId, toStatus, location, notes, temperature, humidity } = value;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if current user is the owner
    if (product.currentOwner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the current owner can transfer the product'
      });
    }

    // Check if transferring to self
    if (toUserId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer product to yourself'
      });
    }

    // Validate status transition
    const validTransitions = {
      'harvested': ['processed'],
      'processed': ['packaged'],
      'packaged': ['in-transit', 'at-warehouse'],
      'in-transit': ['at-warehouse', 'at-retailer', 'delivered'],
      'at-warehouse': ['in-transit', 'at-retailer'],
      'at-retailer': ['delivered'],
      'delivered': ['consumed']
    };

    if (!validTransitions[product.currentStatus] || 
        !validTransitions[product.currentStatus].includes(toStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${product.currentStatus} to ${toStatus}`
      });
    }

    // Create supply chain entry
    const supplyChainEntry = {
      from: req.user._id,
      to: toUserId,
      fromStatus: product.currentStatus,
      toStatus: toStatus,
      timestamp: new Date(),
      location: location,
      notes: notes || '',
      temperature: temperature || null,
      humidity: humidity || null,
      blockchainTxHash: null // This would be set when blockchain transaction is confirmed
    };

    // Add supply chain entry and update product
    await product.addSupplyChainEntry(supplyChainEntry);

    // Populate the updated product
    await product.populate([
      { path: 'farmer', select: 'firstName lastName email organization' },
      { path: 'currentOwner', select: 'firstName lastName email organization' },
      { path: 'supplyChain.from', select: 'firstName lastName email organization' },
      { path: 'supplyChain.to', select: 'firstName lastName email organization' }
    ]);

    logger.info(`Product ${product.name} transferred from ${req.user.email} to ${toUserId}`);

    res.json({
      success: true,
      message: 'Product transferred successfully',
      data: { product }
    });

  } catch (error) {
    logger.error('Transfer product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transfer product'
    });
  }
});

// @route   PUT /api/supply-chain/status
// @desc    Update product status without transferring ownership
// @access  Private
router.put('/status', authenticateToken, requireVerification, async (req, res) => {
  try {
    const { error, value } = updateStatusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { productId, newStatus, location, notes, temperature, humidity } = value;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if current user is the owner
    if (product.currentOwner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the current owner can update product status'
      });
    }

    // Validate status transition
    const validTransitions = {
      'harvested': ['processed'],
      'processed': ['packaged'],
      'packaged': ['in-transit', 'at-warehouse'],
      'in-transit': ['at-warehouse', 'at-retailer', 'delivered'],
      'at-warehouse': ['in-transit', 'at-retailer'],
      'at-retailer': ['delivered'],
      'delivered': ['consumed']
    };

    if (!validTransitions[product.currentStatus] || 
        !validTransitions[product.currentStatus].includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${product.currentStatus} to ${newStatus}`
      });
    }

    // Update product status
    product.currentStatus = newStatus;

    // Add status update to supply chain
    const statusUpdateEntry = {
      from: req.user._id,
      to: req.user._id,
      fromStatus: product.currentStatus,
      toStatus: newStatus,
      timestamp: new Date(),
      location: location,
      notes: notes || '',
      temperature: temperature || null,
      humidity: humidity || null,
      blockchainTxHash: null
    };

    product.supplyChain.push(statusUpdateEntry);
    await product.save();

    // Populate the updated product
    await product.populate([
      { path: 'farmer', select: 'firstName lastName email organization' },
      { path: 'currentOwner', select: 'firstName lastName email organization' },
      { path: 'supplyChain.from', select: 'firstName lastName email organization' },
      { path: 'supplyChain.to', select: 'firstName lastName email organization' }
    ]);

    logger.info(`Product ${product.name} status updated to ${newStatus} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Product status updated successfully',
      data: { product }
    });

  } catch (error) {
    logger.error('Update product status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product status'
    });
  }
});

// @route   GET /api/supply-chain/:productId/history
// @desc    Get supply chain history for a product
// @access  Public
router.get('/:productId/history', async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId)
      .populate('farmer', 'firstName lastName email organization')
      .populate('currentOwner', 'firstName lastName email organization')
      .populate('supplyChain.from', 'firstName lastName email organization')
      .populate('supplyChain.to', 'firstName lastName email organization');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const history = product.getSupplyChainHistory().map(entry => ({
      id: entry._id,
      from: {
        id: entry.from._id,
        name: entry.from.firstName + ' ' + entry.from.lastName,
        email: entry.from.email,
        organization: entry.from.organization
      },
      to: {
        id: entry.to._id,
        name: entry.to.firstName + ' ' + entry.to.lastName,
        email: entry.to.email,
        organization: entry.to.organization
      },
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      timestamp: entry.timestamp,
      location: entry.location,
      notes: entry.notes,
      temperature: entry.temperature,
      humidity: entry.humidity,
      blockchainTxHash: entry.blockchainTxHash
    }));

    res.json({
      success: true,
      data: {
        product: {
          id: product._id,
          name: product.name,
          category: product.category,
          currentStatus: product.currentStatus,
          currentOwner: {
            id: product.currentOwner._id,
            name: product.currentOwner.firstName + ' ' + product.currentOwner.lastName,
            email: product.currentOwner.email,
            organization: product.currentOwner.organization
          }
        },
        history
      }
    });

  } catch (error) {
    logger.error('Get supply chain history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supply chain history'
    });
  }
});

// @route   GET /api/supply-chain/my-products
// @desc    Get products owned by current user
// @access  Private
router.get('/my-products', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { 
      currentOwner: req.user._id,
      isActive: true
    };

    if (status) {
      query.currentStatus = status;
    }

    const products = await Product.find(query)
      .populate('farmer', 'firstName lastName email organization')
      .populate('currentOwner', 'firstName lastName email organization')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

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
    logger.error('Get my products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your products'
    });
  }
});

// @route   GET /api/supply-chain/statistics
// @desc    Get supply chain statistics
// @access  Private
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let matchQuery = {};
    
    // Filter based on user role
    if (userRole === 'farmer') {
      matchQuery = { farmer: userId };
    } else if (userRole !== 'admin') {
      matchQuery = { 
        $or: [
          { farmer: userId },
          { currentOwner: userId },
          { 'supplyChain.from': userId },
          { 'supplyChain.to': userId }
        ]
      };
    }

    const pipeline = [
      { $match: { ...matchQuery, isActive: true } },
      {
        $group: {
          _id: '$currentStatus',
          count: { $sum: 1 }
        }
      }
    ];

    const statusStats = await Product.aggregate(pipeline);

    const totalProducts = await Product.countDocuments({ ...matchQuery, isActive: true });
    const verifiedProducts = await Product.countDocuments({ ...matchQuery, isActive: true, isVerified: true });

    // Get recent transfers
    const recentTransfers = await Product.find({ ...matchQuery, isActive: true })
      .populate('supplyChain.to', 'firstName lastName email')
      .sort({ 'supplyChain.timestamp': -1 })
      .limit(5)
      .select('name currentStatus supplyChain');

    res.json({
      success: true,
      data: {
        totalProducts,
        verifiedProducts,
        verificationRate: totalProducts > 0 ? (verifiedProducts / totalProducts * 100).toFixed(2) : 0,
        statusDistribution: statusStats,
        recentTransfers: recentTransfers.map(product => ({
          name: product.name,
          currentStatus: product.currentStatus,
          lastTransfer: product.supplyChain[product.supplyChain.length - 1]
        }))
      }
    });

  } catch (error) {
    logger.error('Get supply chain statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supply chain statistics'
    });
  }
});

module.exports = router;
