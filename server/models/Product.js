const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  blockchainId: {
    type: Number,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['vegetables', 'fruits', 'grains', 'herbs', 'spices', 'nuts', 'legumes', 'other'],
    trim: true
  },
  variety: {
    type: String,
    required: [true, 'Variety is required'],
    trim: true,
    maxlength: [50, 'Variety cannot exceed 50 characters']
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Farmer is required']
  },
  harvestDate: {
    type: Date,
    required: [true, 'Harvest date is required'],
    validate: {
      validator: function(value) {
        return value <= new Date();
      },
      message: 'Harvest date cannot be in the future'
    }
  },
  location: {
    name: { type: String, required: true, trim: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      zipCode: { type: String, trim: true }
    }
  },
  quality: {
    score: { type: Number, min: 1, max: 10, default: null },
    notes: { type: String, trim: true },
    inspector: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    inspectedAt: { type: Date, default: null }
  },
  certifications: [{
    type: {
      type: String,
      enum: ['organic', 'fair-trade', 'non-gmo', 'local', 'sustainable', 'rainforest-alliance', 'usda-organic', 'eu-organic'],
      required: true
    },
    certNumber: { type: String, required: true },
    certifier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issuedDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true }
  }],
  images: [{
    url: { type: String, required: true },
    caption: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  currentStatus: {
    type: String,
    enum: ['harvested', 'processed', 'packaged', 'in-transit', 'at-warehouse', 'at-retailer', 'delivered', 'consumed'],
    default: 'harvested'
  },
  currentOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  supplyChain: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fromStatus: { type: String, required: true },
    toStatus: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    location: { type: String, required: true },
    notes: { type: String, trim: true },
    temperature: { type: Number }, // in Celsius
    humidity: { type: Number }, // percentage
    blockchainTxHash: { type: String, trim: true }
  }],
  qrCode: {
    data: { type: String, unique: true, sparse: true },
    imageUrl: { type: String },
    generatedAt: { type: Date, default: Date.now }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    weight: { type: Number }, // in kg
    volume: { type: Number }, // in liters
    batchNumber: { type: String, trim: true },
    lotNumber: { type: String, trim: true },
    packagingType: { type: String, trim: true },
    storageConditions: { type: String, trim: true },
    shelfLife: { type: Number }, // in days
    allergens: [{ type: String, trim: true }],
    nutritionalInfo: {
      calories: { type: Number },
      protein: { type: Number },
      carbs: { type: Number },
      fat: { type: Number },
      fiber: { type: Number },
      sugar: { type: Number }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for product age in days
productSchema.virtual('ageInDays').get(function() {
  return Math.floor((new Date() - this.harvestDate) / (1000 * 60 * 60 * 24));
});

// Virtual for current location
productSchema.virtual('currentLocation').get(function() {
  if (this.supplyChain.length > 0) {
    return this.supplyChain[this.supplyChain.length - 1].location;
  }
  return this.location.name;
});

// Indexes for better query performance
productSchema.index({ blockchainId: 1 });
productSchema.index({ farmer: 1 });
productSchema.index({ currentOwner: 1 });
productSchema.index({ category: 1 });
productSchema.index({ currentStatus: 1 });
productSchema.index({ 'location.coordinates': '2dsphere' });
productSchema.index({ harvestDate: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ 'certifications.type': 1 });
productSchema.index({ isVerified: 1 });
productSchema.index({ isActive: 1 });

// Text index for search
productSchema.index({
  name: 'text',
  variety: 'text',
  'location.name': 'text',
  'metadata.batchNumber': 'text',
  'metadata.lotNumber': 'text'
});

// Pre-save middleware to generate QR code data
productSchema.pre('save', function(next) {
  if (this.isNew && !this.qrCode.data) {
    this.qrCode.data = `agrichain://product/${this._id}`;
  }
  next();
});

// Instance method to add supply chain entry
productSchema.methods.addSupplyChainEntry = function(entry) {
  this.supplyChain.push(entry);
  this.currentStatus = entry.toStatus;
  this.currentOwner = entry.to;
  return this.save();
};

// Instance method to get supply chain history
productSchema.methods.getSupplyChainHistory = function() {
  return this.supplyChain.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// Instance method to verify product
productSchema.methods.verify = function() {
  this.isVerified = true;
  return this.save();
};

// Instance method to add certification
productSchema.methods.addCertification = function(certification) {
  this.certifications.push(certification);
  return this.save();
};

// Static method to find by blockchain ID
productSchema.statics.findByBlockchainId = function(blockchainId) {
  return this.findOne({ blockchainId });
};

// Static method to find by farmer
productSchema.statics.findByFarmer = function(farmerId) {
  return this.find({ farmer: farmerId, isActive: true });
};

// Static method to find by current owner
productSchema.statics.findByCurrentOwner = function(ownerId) {
  return this.find({ currentOwner: ownerId, isActive: true });
};

// Static method to find by category
productSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true });
};

// Static method to find verified products
productSchema.statics.findVerified = function() {
  return this.find({ isVerified: true, isActive: true });
};

// Static method to search products
productSchema.statics.search = function(query, options = {}) {
  const searchQuery = {
    $text: { $search: query },
    isActive: true
  };
  
  if (options.category) {
    searchQuery.category = options.category;
  }
  
  if (options.farmer) {
    searchQuery.farmer = options.farmer;
  }
  
  if (options.verified !== undefined) {
    searchQuery.isVerified = options.verified;
  }
  
  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .populate('farmer', 'firstName lastName email organization')
    .populate('currentOwner', 'firstName lastName email organization');
};

module.exports = mongoose.model('Product', productSchema);
