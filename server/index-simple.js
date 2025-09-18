const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import simple database
const db = require('./config/database-simple');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: 'in-memory'
  });
});

// Simple authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  // For demo purposes, accept any token that starts with 'demo'
  if (token.startsWith('demo')) {
    req.user = { _id: 'demo_user', email: 'demo@example.com', role: 'farmer' };
    next();
  } else {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// API Routes

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'john@example.com' && password === 'password123') {
    const user = db.findUserByEmail(email);
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          organization: user.organization,
          isVerified: user.isVerified
        },
        token: 'demo_token_123'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  const userData = req.body;
  const user = db.createUser(userData);
  
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        organization: user.organization,
        isVerified: user.isVerified
      },
      token: 'demo_token_123'
    }
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'farmer',
        organization: 'Green Farm',
        isVerified: true
      }
    }
  });
});

// Products routes
app.get('/api/products', (req, res) => {
  const products = db.findProducts(req.query);
  res.json({
    success: true,
    data: {
      products: products.map(product => ({
        ...product,
        farmer: db.findUserById(product.farmer),
        currentOwner: db.findUserById(product.currentOwner)
      }))
    }
  });
});

app.get('/api/products/:id', (req, res) => {
  const product = db.findProductById(req.params.id);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }
  
  res.json({
    success: true,
    data: {
      product: {
        ...product,
        farmer: db.findUserById(product.farmer),
        currentOwner: db.findUserById(product.currentOwner)
      }
    }
  });
});

app.post('/api/products', authenticateToken, (req, res) => {
  const productData = {
    ...req.body,
    farmer: req.user._id,
    currentOwner: req.user._id
  };
  
  const product = db.createProduct(productData);
  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: { product }
  });
});

app.get('/api/products/:id/trace', (req, res) => {
  const product = db.findProductById(req.params.id);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }
  
  const supplyChain = db.findSupplyChainByProduct(req.params.id);
  const certifications = db.findCertificationsByProduct(req.params.id);
  
  res.json({
    success: true,
    data: {
      product: {
        ...product,
        farmer: db.findUserById(product.farmer),
        currentOwner: db.findUserById(product.currentOwner)
      },
      supplyChain,
      certifications
    }
  });
});

// QR Code routes
app.get('/api/qr/generate/:productId', authenticateToken, (req, res) => {
  const product = db.findProductById(req.params.id);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }
  
  const qrData = {
    productId: product._id,
    name: product.name,
    category: product.category,
    farmer: product.farmer,
    harvestDate: product.harvestDate,
    qrCode: product.qrCode.data
  };
  
  // Generate a simple QR code data URL (base64 encoded JSON)
  const qrCodeDataURL = `data:image/png;base64,${Buffer.from(JSON.stringify(qrData)).toString('base64')}`;
  
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
});

app.post('/api/qr/scan', (req, res) => {
  const { qrData } = req.body;
  
  try {
    const data = JSON.parse(qrData);
    const product = db.findProductById(data.productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const farmer = db.findUserById(product.farmer);
    const currentOwner = db.findUserById(product.currentOwner);
    const supplyChain = db.findSupplyChainByProduct(product._id);
    const certifications = db.findCertificationsByProduct(product._id);
    
    res.json({
      success: true,
      data: {
        product: {
          id: product._id,
          name: product.name,
          category: product.category,
          variety: product.variety,
          harvestDate: product.harvestDate,
          currentStatus: product.currentStatus,
          isVerified: product.isVerified,
          ageInDays: Math.floor((new Date() - new Date(product.harvestDate)) / (1000 * 60 * 60 * 24))
        },
        farmer: {
          name: `${farmer.firstName} ${farmer.lastName}`,
          email: farmer.email,
          organization: farmer.organization
        },
        currentOwner: {
          name: `${currentOwner.firstName} ${currentOwner.lastName}`,
          email: currentOwner.email,
          organization: currentOwner.organization
        },
        supplyChain: supplyChain.map(entry => ({
          from: 'Previous Owner',
          to: 'Current Owner',
          fromStatus: entry.fromStatus,
          toStatus: entry.toStatus,
          timestamp: entry.timestamp,
          location: entry.location,
          notes: entry.notes
        })),
        certifications: certifications.map(cert => ({
          type: cert.type,
          certNumber: cert.certNumber,
          issuedDate: cert.issuedDate,
          expiryDate: cert.expiryDate
        }))
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid QR code data'
    });
  }
});

// Analytics routes
app.get('/api/analytics/dashboard', authenticateToken, (req, res) => {
  const stats = db.getStats();
  const products = db.findProducts();
  
  const statusDistribution = products.reduce((acc, product) => {
    acc[product.currentStatus] = (acc[product.currentStatus] || 0) + 1;
    return acc;
  }, {});
  
  const categoryDistribution = products.reduce((acc, product) => {
    acc[product.category] = (acc[product.category] || 0) + 1;
    return acc;
  }, {});
  
  res.json({
    success: true,
    data: {
      overview: {
        totalProducts: stats.totalProducts,
        verifiedProducts: stats.verifiedProducts,
        verificationRate: stats.totalProducts > 0 ? (stats.verifiedProducts / stats.totalProducts * 100).toFixed(2) : 0,
        totalInspected: stats.verifiedProducts
      },
      statusDistribution: Object.entries(statusDistribution).map(([status, count]) => ({
        _id: status,
        count
      })),
      categoryDistribution: Object.entries(categoryDistribution).map(([category, count]) => ({
        _id: category,
        count
      })),
      recentProducts: products.slice(0, 5).map(product => ({
        ...product,
        farmer: db.findUserById(product.farmer)
      }))
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AgriChain Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📱 Demo Login: john@example.com / password123`);
});

module.exports = app;
