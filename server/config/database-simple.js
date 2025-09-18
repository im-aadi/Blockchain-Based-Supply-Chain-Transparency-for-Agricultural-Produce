// Simple in-memory database for demonstration
// This replaces MongoDB for demo purposes

class SimpleDatabase {
  constructor() {
    this.data = {
      users: [],
      products: [],
      supplyChain: [],
      certifications: []
    };
    this.counters = {
      users: 0,
      products: 0,
      supplyChain: 0,
      certifications: 0
    };
  }

  // User operations
  createUser(userData) {
    const user = {
      _id: `user_${++this.counters.users}`,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.users.push(user);
    return user;
  }

  findUserByEmail(email) {
    return this.data.users.find(user => user.email === email);
  }

  findUserById(id) {
    return this.data.users.find(user => user._id === id);
  }

  updateUser(id, updateData) {
    const userIndex = this.data.users.findIndex(user => user._id === id);
    if (userIndex !== -1) {
      this.data.users[userIndex] = {
        ...this.data.users[userIndex],
        ...updateData,
        updatedAt: new Date()
      };
      return this.data.users[userIndex];
    }
    return null;
  }

  // Product operations
  createProduct(productData) {
    const product = {
      _id: `product_${++this.counters.products}`,
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.products.push(product);
    return product;
  }

  findProductById(id) {
    return this.data.products.find(product => product._id === id);
  }

  findProducts(query = {}) {
    let products = [...this.data.products];
    
    if (query.category) {
      products = products.filter(p => p.category === query.category);
    }
    
    if (query.farmer) {
      products = products.filter(p => p.farmer === query.farmer);
    }
    
    if (query.verified !== undefined) {
      products = products.filter(p => p.isVerified === query.verified);
    }
    
    return products;
  }

  updateProduct(id, updateData) {
    const productIndex = this.data.products.findIndex(product => product._id === id);
    if (productIndex !== -1) {
      this.data.products[productIndex] = {
        ...this.data.products[productIndex],
        ...updateData,
        updatedAt: new Date()
      };
      return this.data.products[productIndex];
    }
    return null;
  }

  // Supply chain operations
  addSupplyChainEntry(entry) {
    const supplyChainEntry = {
      _id: `supply_${++this.counters.supplyChain}`,
      ...entry,
      createdAt: new Date()
    };
    this.data.supplyChain.push(supplyChainEntry);
    return supplyChainEntry;
  }

  findSupplyChainByProduct(productId) {
    return this.data.supplyChain.filter(entry => entry.productId === productId);
  }

  // Certification operations
  addCertification(certData) {
    const certification = {
      _id: `cert_${++this.counters.certifications}`,
      ...certData,
      createdAt: new Date()
    };
    this.data.certifications.push(certification);
    return certification;
  }

  findCertificationsByProduct(productId) {
    return this.data.certifications.filter(cert => cert.productId === productId);
  }

  // Analytics
  getStats() {
    return {
      totalUsers: this.data.users.length,
      totalProducts: this.data.products.length,
      verifiedProducts: this.data.products.filter(p => p.isVerified).length,
      totalSupplyChainEntries: this.data.supplyChain.length,
      totalCertifications: this.data.certifications.length
    };
  }
}

// Create singleton instance
const db = new SimpleDatabase();

// Mock some sample data
const sampleUser = db.createUser({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/4.5.6.7.8.9.0',
  role: 'farmer',
  organization: 'Green Farm',
  isVerified: true,
  isActive: true
});

const sampleProduct = db.createProduct({
  name: 'Organic Tomatoes',
  category: 'vegetables',
  variety: 'Cherry',
  farmer: sampleUser._id,
  harvestDate: new Date('2024-01-15'),
  location: {
    name: 'Green Farm',
    coordinates: {
      latitude: 37.7749,
      longitude: -122.4194
    }
  },
  currentStatus: 'harvested',
  currentOwner: sampleUser._id,
  isVerified: true,
  isActive: true,
  qrCode: {
    data: 'agrichain://product/sample_product_1',
    generatedAt: new Date()
  }
});

module.exports = db;
