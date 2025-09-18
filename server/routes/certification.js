const express = require('express');
const Joi = require('joi');
const Product = require('../models/Product');
const { authenticateToken, authorize, requireVerification } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const addCertificationSchema = Joi.object({
  productId: Joi.string().required(),
  type: Joi.string().valid('organic', 'fair-trade', 'non-gmo', 'local', 'sustainable', 'rainforest-alliance', 'usda-organic', 'eu-organic').required(),
  certNumber: Joi.string().required().trim(),
  issuedDate: Joi.date().max('now').required(),
  expiryDate: Joi.date().min('now').required(),
  description: Joi.string().required().trim(),
  standards: Joi.string().trim().allow('')
});

const updateCertificationSchema = Joi.object({
  certNumber: Joi.string().trim(),
  issuedDate: Joi.date().max('now'),
  expiryDate: Joi.date().min('now'),
  description: Joi.string().trim(),
  standards: Joi.string().trim().allow(''),
  isActive: Joi.boolean()
});

// @route   POST /api/certification/add
// @desc    Add certification to a product
// @access  Private (Certifiers only)
router.post('/add', authenticateToken, authorize('certifier'), requireVerification, async (req, res) => {
  try {
    const { error, value } = addCertificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { productId, type, certNumber, issuedDate, expiryDate, description, standards } = value;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if certification number already exists
    const existingCert = product.certifications.find(cert => cert.certNumber === certNumber);
    if (existingCert) {
      return res.status(409).json({
        success: false,
        message: 'Certification number already exists'
      });
    }

    // Add certification
    const certification = {
      type,
      certNumber,
      certifier: req.user._id,
      issuedDate,
      expiryDate,
      description,
      standards: standards || getCertificationStandards(type),
      isActive: true
    };

    await product.addCertification(certification);

    // Populate the updated product
    await product.populate('certifications.certifier', 'firstName lastName email organization');

    logger.info(`Certification added to product ${product.name} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Certification added successfully',
      data: { product }
    });

  } catch (error) {
    logger.error('Add certification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add certification'
    });
  }
});

// @route   PUT /api/certification/:productId/:certId
// @desc    Update a certification
// @access  Private (Certifier who issued it or admin)
router.put('/:productId/:certId', authenticateToken, async (req, res) => {
  try {
    const { error, value } = updateCertificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const certification = product.certifications.id(req.params.certId);
    if (!certification) {
      return res.status(404).json({
        success: false,
        message: 'Certification not found'
      });
    }

    // Check if user can update this certification
    if (certification.certifier.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the certifier or admin can update this certification'
      });
    }

    // Update certification
    Object.assign(certification, value);
    await product.save();

    // Populate the updated product
    await product.populate('certifications.certifier', 'firstName lastName email organization');

    logger.info(`Certification updated for product ${product.name} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Certification updated successfully',
      data: { product }
    });

  } catch (error) {
    logger.error('Update certification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update certification'
    });
  }
});

// @route   DELETE /api/certification/:productId/:certId
// @desc    Revoke a certification
// @access  Private (Certifier who issued it or admin)
router.delete('/:productId/:certId', authenticateToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const certification = product.certifications.id(req.params.certId);
    if (!certification) {
      return res.status(404).json({
        success: false,
        message: 'Certification not found'
      });
    }

    // Check if user can revoke this certification
    if (certification.certifier.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the certifier or admin can revoke this certification'
      });
    }

    // Revoke certification
    certification.isActive = false;
    await product.save();

    logger.info(`Certification revoked for product ${product.name} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Certification revoked successfully'
    });

  } catch (error) {
    logger.error('Revoke certification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke certification'
    });
  }
});

// @route   GET /api/certification/:productId
// @desc    Get certifications for a product
// @access  Public
router.get('/:productId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId)
      .populate('certifications.certifier', 'firstName lastName email organization');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const activeCertifications = product.certifications.filter(cert => 
      cert.isActive && new Date(cert.expiryDate) > new Date()
    );

    res.json({
      success: true,
      data: {
        product: {
          id: product._id,
          name: product.name,
          category: product.category
        },
        certifications: activeCertifications
      }
    });

  } catch (error) {
    logger.error('Get certifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certifications'
    });
  }
});

// @route   GET /api/certification/verify/:certNumber
// @desc    Verify a certification by certificate number
// @access  Public
router.get('/verify/:certNumber', async (req, res) => {
  try {
    const product = await Product.findOne({
      'certifications.certNumber': req.params.certNumber,
      isActive: true
    }).populate('certifications.certifier', 'firstName lastName email organization');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Certification not found',
        isValid: false
      });
    }

    const certification = product.certifications.find(cert => 
      cert.certNumber === req.params.certNumber
    );

    if (!certification) {
      return res.status(404).json({
        success: false,
        message: 'Certification not found',
        isValid: false
      });
    }

    const isActive = certification.isActive;
    const isExpired = new Date(certification.expiryDate) <= new Date();
    const isValid = isActive && !isExpired;

    res.json({
      success: true,
      data: {
        isValid,
        isActive,
        isExpired,
        certification: {
          type: certification.type,
          certNumber: certification.certNumber,
          issuedDate: certification.issuedDate,
          expiryDate: certification.expiryDate,
          description: certification.description,
          standards: certification.standards,
          certifier: certification.certifier
        },
        product: {
          id: product._id,
          name: product.name,
          category: product.category,
          farmer: product.farmer
        }
      }
    });

  } catch (error) {
    logger.error('Verify certification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify certification'
    });
  }
});

// @route   GET /api/certification/types
// @desc    Get available certification types and their standards
// @access  Public
router.get('/types', (req, res) => {
  const certificationTypes = [
    {
      type: 'organic',
      name: 'Organic',
      description: 'Produced without synthetic pesticides, fertilizers, or GMOs',
      standards: 'USDA Organic Standards'
    },
    {
      type: 'fair-trade',
      name: 'Fair Trade',
      description: 'Ensures fair wages and working conditions for farmers',
      standards: 'Fair Trade USA Standards'
    },
    {
      type: 'non-gmo',
      name: 'Non-GMO',
      description: 'Verified to be free from genetically modified organisms',
      standards: 'Non-GMO Project Standards'
    },
    {
      type: 'local',
      name: 'Local',
      description: 'Sourced from local producers within a specific radius',
      standards: 'Local Sourcing Standards'
    },
    {
      type: 'sustainable',
      name: 'Sustainable',
      description: 'Produced using environmentally sustainable practices',
      standards: 'Sustainable Agriculture Standards'
    },
    {
      type: 'rainforest-alliance',
      name: 'Rainforest Alliance',
      description: 'Certified by Rainforest Alliance for environmental and social standards',
      standards: 'Rainforest Alliance Standards'
    },
    {
      type: 'usda-organic',
      name: 'USDA Organic',
      description: 'Certified organic by the United States Department of Agriculture',
      standards: 'USDA Organic Standards'
    },
    {
      type: 'eu-organic',
      name: 'EU Organic',
      description: 'Certified organic by European Union standards',
      standards: 'EU Organic Standards'
    }
  ];

  res.json({
    success: true,
    data: { certificationTypes }
  });
});

// @route   GET /api/certification/my-certifications
// @desc    Get certifications issued by current user
// @access  Private (Certifiers only)
router.get('/my-certifications', authenticateToken, authorize('certifier'), async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;

    const query = {
      'certifications.certifier': req.user._id,
      isActive: true
    };

    if (type) {
      query['certifications.type'] = type;
    }

    const products = await Product.find(query)
      .populate('farmer', 'firstName lastName email organization')
      .populate('certifications.certifier', 'firstName lastName email organization')
      .sort({ 'certifications.issuedDate': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter certifications based on status
    let filteredProducts = products;
    if (status === 'active') {
      filteredProducts = products.filter(product => 
        product.certifications.some(cert => 
          cert.certifier.toString() === req.user._id.toString() && 
          cert.isActive && 
          new Date(cert.expiryDate) > new Date()
        )
      );
    } else if (status === 'expired') {
      filteredProducts = products.filter(product => 
        product.certifications.some(cert => 
          cert.certifier.toString() === req.user._id.toString() && 
          cert.isActive && 
          new Date(cert.expiryDate) <= new Date()
        )
      );
    }

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products: filteredProducts,
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
    logger.error('Get my certifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your certifications'
    });
  }
});

// Helper function to get certification standards
function getCertificationStandards(type) {
  const standards = {
    'organic': 'USDA Organic Standards',
    'fair-trade': 'Fair Trade USA Standards',
    'non-gmo': 'Non-GMO Project Standards',
    'local': 'Local Sourcing Standards',
    'sustainable': 'Sustainable Agriculture Standards',
    'rainforest-alliance': 'Rainforest Alliance Standards',
    'usda-organic': 'USDA Organic Standards',
    'eu-organic': 'EU Organic Standards'
  };
  return standards[type] || 'Custom Standards';
}

module.exports = router;
