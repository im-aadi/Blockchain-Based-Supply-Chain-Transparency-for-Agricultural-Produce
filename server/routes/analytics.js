const express = require('express');
const Product = require('../models/Product');
const { authenticateToken, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics
// @access  Private
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Build match query based on user role
    let matchQuery = {};
    if (userRole === 'farmer') {
      matchQuery = { farmer: userId };
    } else if (userRole === 'distributor' || userRole === 'retailer') {
      matchQuery = { 
        $or: [
          { farmer: userId },
          { currentOwner: userId },
          { 'supplyChain.from': userId },
          { 'supplyChain.to': userId }
        ]
      };
    } else if (userRole !== 'admin') {
      matchQuery = { 
        $or: [
          { farmer: userId },
          { currentOwner: userId }
        ]
      };
    }

    // Get basic statistics
    const [
      totalProducts,
      verifiedProducts,
      productsByStatus,
      productsByCategory,
      recentProducts,
      monthlyStats
    ] = await Promise.all([
      // Total products
      Product.countDocuments({ ...matchQuery, isActive: true }),
      
      // Verified products
      Product.countDocuments({ ...matchQuery, isActive: true, isVerified: true }),
      
      // Products by status
      Product.aggregate([
        { $match: { ...matchQuery, isActive: true } },
        {
          $group: {
            _id: '$currentStatus',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),
      
      // Products by category
      Product.aggregate([
        { $match: { ...matchQuery, isActive: true } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),
      
      // Recent products
      Product.find({ ...matchQuery, isActive: true })
        .populate('farmer', 'firstName lastName email')
        .populate('currentOwner', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name category currentStatus isVerified createdAt'),
      
      // Monthly statistics for the last 12 months
      Product.aggregate([
        {
          $match: {
            ...matchQuery,
            isActive: true,
            createdAt: {
              $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    ]);

    // Calculate verification rate
    const verificationRate = totalProducts > 0 ? (verifiedProducts / totalProducts * 100).toFixed(2) : 0;

    // Get supply chain efficiency metrics
    const supplyChainStats = await Product.aggregate([
      { $match: { ...matchQuery, isActive: true } },
      {
        $project: {
          supplyChainLength: { $size: '$supplyChain' },
          currentStatus: 1,
          createdAt: 1,
          updatedAt: 1
        }
      },
      {
        $group: {
          _id: null,
          avgSupplyChainLength: { $avg: '$supplyChainLength' },
          maxSupplyChainLength: { $max: '$supplyChainLength' },
          minSupplyChainLength: { $min: '$supplyChainLength' }
        }
      }
    ]);

    // Get quality statistics
    const qualityStats = await Product.aggregate([
      { 
        $match: { 
          ...matchQuery, 
          isActive: true,
          'quality.score': { $exists: true, $ne: null }
        } 
      },
      {
        $group: {
          _id: null,
          avgQualityScore: { $avg: '$quality.score' },
          maxQualityScore: { $max: '$quality.score' },
          minQualityScore: { $min: '$quality.score' },
          totalInspected: { $sum: 1 }
        }
      }
    ]);

    // Get certification statistics
    const certificationStats = await Product.aggregate([
      { $match: { ...matchQuery, isActive: true } },
      { $unwind: '$certifications' },
      {
        $match: {
          'certifications.isActive': true,
          'certifications.expiryDate': { $gt: new Date() }
        }
      },
      {
        $group: {
          _id: '$certifications.type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalProducts,
          verifiedProducts,
          verificationRate: parseFloat(verificationRate),
          totalInspected: qualityStats[0]?.totalInspected || 0
        },
        statusDistribution: productsByStatus,
        categoryDistribution: productsByCategory,
        supplyChain: supplyChainStats[0] || {
          avgSupplyChainLength: 0,
          maxSupplyChainLength: 0,
          minSupplyChainLength: 0
        },
        quality: qualityStats[0] || {
          avgQualityScore: 0,
          maxQualityScore: 0,
          minQualityScore: 0,
          totalInspected: 0
        },
        certifications: certificationStats,
        recentProducts,
        monthlyTrends: monthlyStats
      }
    });

  } catch (error) {
    logger.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics'
    });
  }
});

// @route   GET /api/analytics/supply-chain-efficiency
// @desc    Get supply chain efficiency metrics
// @access  Private
router.get('/supply-chain-efficiency', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let matchQuery = {};
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

    // Get supply chain efficiency metrics
    const efficiencyStats = await Product.aggregate([
      { $match: { ...matchQuery, isActive: true } },
      {
        $project: {
          supplyChainLength: { $size: '$supplyChain' },
          currentStatus: 1,
          createdAt: 1,
          updatedAt: 1,
          supplyChain: 1
        }
      },
      {
        $addFields: {
          totalTimeInDays: {
            $divide: [
              { $subtract: ['$updatedAt', '$createdAt'] },
              1000 * 60 * 60 * 24
            ]
          },
          avgTimePerStep: {
            $cond: {
              if: { $gt: ['$supplyChainLength', 0] },
              then: {
                $divide: [
                  {
                    $divide: [
                      { $subtract: ['$updatedAt', '$createdAt'] },
                      1000 * 60 * 60 * 24
                    ]
                  },
                  '$supplyChainLength'
                ]
              },
              else: 0
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          avgSupplyChainLength: { $avg: '$supplyChainLength' },
          avgTotalTime: { $avg: '$totalTimeInDays' },
          avgTimePerStep: { $avg: '$avgTimePerStep' },
          totalProducts: { $sum: 1 }
        }
      }
    ]);

    // Get status transition analysis
    const statusTransitions = await Product.aggregate([
      { $match: { ...matchQuery, isActive: true } },
      { $unwind: '$supplyChain' },
      {
        $group: {
          _id: {
            from: '$supplyChain.fromStatus',
            to: '$supplyChain.toStatus'
          },
          count: { $sum: 1 },
          avgTime: {
            $avg: {
              $divide: [
                { $subtract: ['$supplyChain.timestamp', '$createdAt'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        efficiency: efficiencyStats[0] || {
          avgSupplyChainLength: 0,
          avgTotalTime: 0,
          avgTimePerStep: 0,
          totalProducts: 0
        },
        statusTransitions
      }
    });

  } catch (error) {
    logger.error('Get supply chain efficiency error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supply chain efficiency metrics'
    });
  }
});

// @route   GET /api/analytics/quality-trends
// @desc    Get quality trends and analysis
// @access  Private
router.get('/quality-trends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let matchQuery = {};
    if (userRole === 'farmer') {
      matchQuery = { farmer: userId };
    } else if (userRole !== 'admin') {
      matchQuery = { 
        $or: [
          { farmer: userId },
          { currentOwner: userId }
        ]
      };
    }

    // Get quality trends over time
    const qualityTrends = await Product.aggregate([
      {
        $match: {
          ...matchQuery,
          isActive: true,
          'quality.score': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$quality.inspectedAt' },
            month: { $month: '$quality.inspectedAt' }
          },
          avgScore: { $avg: '$quality.score' },
          count: { $sum: 1 },
          maxScore: { $max: '$quality.score' },
          minScore: { $min: '$quality.score' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get quality distribution
    const qualityDistribution = await Product.aggregate([
      {
        $match: {
          ...matchQuery,
          isActive: true,
          'quality.score': { $exists: true, $ne: null }
        }
      },
      {
        $bucket: {
          groupBy: '$quality.score',
          boundaries: [0, 3, 5, 7, 9, 11],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            avgScore: { $avg: '$quality.score' }
          }
        }
      }
    ]);

    // Get quality by category
    const qualityByCategory = await Product.aggregate([
      {
        $match: {
          ...matchQuery,
          isActive: true,
          'quality.score': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$category',
          avgScore: { $avg: '$quality.score' },
          count: { $sum: 1 },
          maxScore: { $max: '$quality.score' },
          minScore: { $min: '$quality.score' }
        }
      },
      { $sort: { avgScore: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        trends: qualityTrends,
        distribution: qualityDistribution,
        byCategory: qualityByCategory
      }
    });

  } catch (error) {
    logger.error('Get quality trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quality trends'
    });
  }
});

// @route   GET /api/analytics/geographic
// @desc    Get geographic distribution analytics
// @access  Private
router.get('/geographic', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let matchQuery = {};
    if (userRole === 'farmer') {
      matchQuery = { farmer: userId };
    } else if (userRole !== 'admin') {
      matchQuery = { 
        $or: [
          { farmer: userId },
          { currentOwner: userId }
        ]
      };
    }

    // Get geographic distribution
    const geographicStats = await Product.aggregate([
      { $match: { ...matchQuery, isActive: true } },
      {
        $group: {
          _id: {
            country: '$location.address.country',
            state: '$location.address.state',
            city: '$location.address.city'
          },
          count: { $sum: 1 },
          categories: { $addToSet: '$category' },
          avgQuality: { $avg: '$quality.score' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get coordinates for mapping
    const coordinates = await Product.find(
      { 
        ...matchQuery, 
        isActive: true,
        'location.coordinates.latitude': { $exists: true },
        'location.coordinates.longitude': { $exists: true }
      },
      'name category location.coordinates currentStatus isVerified'
    ).limit(1000); // Limit for performance

    res.json({
      success: true,
      data: {
        distribution: geographicStats,
        coordinates: coordinates.map(product => ({
          id: product._id,
          name: product.name,
          category: product.category,
          status: product.currentStatus,
          verified: product.isVerified,
          coordinates: product.location.coordinates
        }))
      }
    });

  } catch (error) {
    logger.error('Get geographic analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch geographic analytics'
    });
  }
});

// @route   GET /api/analytics/export
// @desc    Export analytics data
// @access  Private (Admin only)
router.get('/export', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { format = 'json', startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const matchQuery = {
      isActive: true,
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
    };

    const products = await Product.find(matchQuery)
      .populate('farmer', 'firstName lastName email organization')
      .populate('currentOwner', 'firstName lastName email organization')
      .populate('supplyChain.from', 'firstName lastName email organization')
      .populate('supplyChain.to', 'firstName lastName email organization')
      .populate('certifications.certifier', 'firstName lastName email organization')
      .lean();

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(products);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.csv');
      res.send(csvData);
    } else {
      res.json({
        success: true,
        data: {
          products,
          totalCount: products.length,
          exportedAt: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    logger.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data'
    });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (data.length === 0) return '';

  const headers = [
    'Product ID',
    'Name',
    'Category',
    'Farmer',
    'Current Owner',
    'Status',
    'Verified',
    'Harvest Date',
    'Created At',
    'Quality Score',
    'Certifications',
    'Supply Chain Length'
  ];

  const rows = data.map(product => [
    product._id,
    product.name,
    product.category,
    product.farmer ? `${product.farmer.firstName} ${product.farmer.lastName}` : '',
    product.currentOwner ? `${product.currentOwner.firstName} ${product.currentOwner.lastName}` : '',
    product.currentStatus,
    product.isVerified ? 'Yes' : 'No',
    product.harvestDate,
    product.createdAt,
    product.quality?.score || '',
    product.certifications?.map(cert => cert.type).join(', ') || '',
    product.supplyChain?.length || 0
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  return csvContent;
}

module.exports = router;
