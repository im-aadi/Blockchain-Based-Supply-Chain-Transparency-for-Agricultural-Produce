# AgriChain: Blockchain-Based Supply Chain Transparency for Agricultural Produce.

## 🌾 Overview

AgriChain is a comprehensive blockchain-based platform that ensures complete transparency and traceability in agricultural supply chains. From farm to table, every step of the agricultural produce journey is recorded on the blockchain, providing immutable proof of origin, quality, and handling practices.

## ✨ Key Features

- **Complete Traceability**: Track agricultural produce from seed to consumer
- **Smart Contracts**: Automated compliance and quality verification
- **QR Code Integration**: Easy access to product information via mobile scanning
- **Multi-stakeholder Dashboard**: Separate interfaces for farmers, distributors, retailers, and consumers
- **Quality Assurance**: Automated quality checks and certification
- **Sustainability Tracking**: Monitor environmental impact and sustainable practices
- **Real-time Monitoring**: Live updates on product status and location
- **Mobile Application**: Native mobile apps for all stakeholders

## 🏗️ Architecture

### Smart Contracts (Solidity)
- **ProductRegistry**: Manages product registration and basic information
- **SupplyChain**: Tracks product movement through the supply chain
- **QualityControl**: Handles quality verification and certification
- **Certification**: Manages organic, fair-trade, and other certifications

### Backend (Node.js + Express)
- RESTful API for data management
- Integration with blockchain networks
- Image processing and QR code generation
- Authentication and authorization
- Real-time notifications

### Frontend (React)
- Responsive web dashboard
- Real-time data visualization
- Interactive supply chain maps
- Mobile-optimized interface

### Mobile App (React Native)
- Native mobile experience
- QR code scanning
- Offline capability
- Push notifications

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- Ganache (for local blockchain development)
- MetaMask (for blockchain interaction)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agri-supply-chain-blockchain
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install
   cd ../mobile && npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start local blockchain**
   ```bash
   npm run ganache
   ```

5. **Deploy smart contracts**
   ```bash
   npm run deploy:contracts
   ```

6. **Start the application**
   ```bash
   npm run dev
   ```

## 📱 Mobile App Setup

The mobile application provides native functionality for all stakeholders:

- **Farmers**: Log harvest data, upload photos, scan QR codes
- **Distributors**: Update shipment status, verify quality
- **Retailers**: Manage inventory, track products
- **Consumers**: Scan QR codes, view product history

## 🔧 Configuration

### Environment Variables
```env
# Database
MONGODB_URI=mongodb://localhost:27017/agrichain

# Blockchain
RPC_URL=http://localhost:8545
PRIVATE_KEY=your_private_key
CONTRACT_ADDRESS=0x...

# JWT
JWT_SECRET=your_jwt_secret

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run smart contract tests
truffle test

# Run frontend tests
cd client && npm test
```

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token

### Product Endpoints
- `GET /api/products` - List all products
- `POST /api/products` - Create new product
- `GET /api/products/:id` - Get product details
- `PUT /api/products/:id` - Update product
- `GET /api/products/:id/trace` - Get product traceability

### Supply Chain Endpoints
- `POST /api/supply-chain/transfer` - Transfer product ownership
- `GET /api/supply-chain/:productId/history` - Get supply chain history
- `POST /api/supply-chain/quality-check` - Record quality check

## 🌐 Deployment

### Production Deployment
1. Set up production blockchain network (Ethereum mainnet/Polygon)
2. Configure production environment variables
3. Deploy smart contracts to production network
4. Set up MongoDB Atlas or production database
5. Deploy backend to cloud platform (AWS/Azure/GCP)
6. Deploy frontend to CDN
7. Publish mobile apps to app stores

### Docker Deployment
```bash
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Email: support@agrichain.com
- Documentation: https://docs.agrichain.com
- Issues: GitHub Issues

## 🔮 Roadmap

- [ ] Integration with IoT sensors
- [ ] AI-powered quality prediction
- [ ] Carbon footprint tracking
- [ ] Integration with existing ERP systems
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Integration with government databases
- [ ] Automated compliance reporting

---

**Built with ❤️ for a transparent and sustainable agricultural future**
