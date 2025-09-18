const express = require('express');
const QRCode = require('qrcode');
const Product = require('../models/Product');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/qr/generate/:productId
// @desc    Generate QR code for a product
// @access  Private
router.get('/generate/:productId', authenticateToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user has access to this product
    if (product.farmer.toString() !== req.user._id.toString() && 
        product.currentOwner.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const qrData = {
      productId: product._id,
      name: product.name,
      category: product.category,
      farmer: product.farmer,
      harvestDate: product.harvestDate,
      blockchainId: product.blockchainId,
      qrCode: product.qrCode.data
    };

    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: parseInt(process.env.QR_CODE_SIZE) || 200,
      errorCorrectionLevel: process.env.QR_CODE_ERROR_CORRECTION_LEVEL || 'M',
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Update product with QR code image URL
    if (!product.qrCode.imageUrl) {
      product.qrCode.imageUrl = qrCodeDataURL;
      await product.save();
    }

    logger.info(`QR code generated for product: ${product.name}`);

    res.json({
      success: true,
      data: {
        qrCode: qrCodeDataURL,
        product: {
          id: product._id,
          name: product.name,
          category: product.category,
          harvestDate: product.harvestDate
        }
      }
    });

  } catch (error) {
    logger.error('Generate QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code'
    });
  }
});

// @route   POST /api/qr/scan
// @desc    Scan QR code and get product information
// @access  Public
router.post('/scan', async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: 'QR code data is required'
      });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code data format'
      });
    }

    const { productId } = parsedData;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID not found in QR code'
      });
    }

    const product = await Product.findById(productId)
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
        isVerified: product.isVerified,
        ageInDays: product.ageInDays
      },
      farmer: {
        name: product.farmer.firstName + ' ' + product.farmer.lastName,
        email: product.farmer.email,
        organization: product.farmer.organization,
        phone: product.farmer.phone,
        address: product.farmer.address
      },
      currentOwner: {
        name: product.currentOwner.firstName + ' ' + product.currentOwner.lastName,
        email: product.currentOwner.email,
        organization: product.currentOwner.organization
      },
      location: product.location,
      supplyChain: product.getSupplyChainHistory().map(entry => ({
        from: entry.from.firstName + ' ' + entry.from.lastName,
        to: entry.to.firstName + ' ' + entry.to.lastName,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        timestamp: entry.timestamp,
        location: entry.location,
        notes: entry.notes,
        temperature: entry.temperature,
        humidity: entry.humidity
      })),
      quality: product.quality,
      certifications: product.certifications,
      metadata: product.metadata
    };

    logger.info(`QR code scanned for product: ${product.name}`);

    res.json({
      success: true,
      data: traceabilityData
    });

  } catch (error) {
    logger.error('Scan QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to scan QR code'
    });
  }
});

// @route   GET /api/qr/validate/:productId
// @desc    Validate QR code for a product
// @access  Public
router.get('/validate/:productId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        isValid: false
      });
    }

    const isValid = product.isActive && product.isVerified;

    res.json({
      success: true,
      data: {
        isValid,
        product: {
          id: product._id,
          name: product.name,
          isActive: product.isActive,
          isVerified: product.isVerified,
          currentStatus: product.currentStatus
        }
      }
    });

  } catch (error) {
    logger.error('Validate QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate QR code'
    });
  }
});

// @route   GET /api/qr/batch-generate
// @desc    Generate QR codes for multiple products
// @access  Private (Farmers and Admins)
router.post('/batch-generate', authenticateToken, async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
      });
    }

    if (productIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 50 products allowed per batch'
      });
    }

    const products = await Product.find({
      _id: { $in: productIds },
      farmer: req.user.role === 'admin' ? { $exists: true } : req.user._id
    });

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No products found'
      });
    }

    const qrCodes = [];

    for (const product of products) {
      const qrData = {
        productId: product._id,
        name: product.name,
        category: product.category,
        farmer: product.farmer,
        harvestDate: product.harvestDate,
        blockchainId: product.blockchainId,
        qrCode: product.qrCode.data
      };

      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: parseInt(process.env.QR_CODE_SIZE) || 200,
        errorCorrectionLevel: process.env.QR_CODE_ERROR_CORRECTION_LEVEL || 'M',
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      qrCodes.push({
        productId: product._id,
        productName: product.name,
        qrCode: qrCodeDataURL
      });

      // Update product with QR code image URL if not already set
      if (!product.qrCode.imageUrl) {
        product.qrCode.imageUrl = qrCodeDataURL;
        await product.save();
      }
    }

    logger.info(`Batch QR codes generated for ${qrCodes.length} products by ${req.user.email}`);

    res.json({
      success: true,
      data: {
        qrCodes,
        count: qrCodes.length
      }
    });

  } catch (error) {
    logger.error('Batch generate QR codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate batch QR codes'
    });
  }
});

module.exports = router;
