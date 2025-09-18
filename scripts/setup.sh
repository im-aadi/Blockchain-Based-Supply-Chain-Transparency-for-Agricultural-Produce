#!/bin/bash

# AgriChain Setup Script
# This script sets up the development environment for AgriChain

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌾 Welcome to AgriChain Setup!${NC}"
echo -e "${BLUE}Setting up your blockchain-based agricultural supply chain platform...${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    echo -e "${YELLOW}Download from: https://nodejs.org/${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18+ is required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) is installed${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm $(npm -v) is installed${NC}"

# Install root dependencies
echo -e "${YELLOW}📦 Installing root dependencies...${NC}"
npm install

# Install backend dependencies
echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
cd server
npm install
cd ..

# Install frontend dependencies
echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
cd client
npm install
cd ..

# Install mobile dependencies (if React Native is available)
if command -v react-native &> /dev/null; then
    echo -e "${YELLOW}📦 Installing mobile dependencies...${NC}"
    cd mobile
    npm install
    cd ..
else
    echo -e "${YELLOW}⚠️  React Native CLI not found. Skipping mobile app setup.${NC}"
    echo -e "${YELLOW}To set up mobile app, install React Native CLI: npm install -g react-native-cli${NC}"
fi

# Create environment files
echo -e "${YELLOW}⚙️  Creating environment files...${NC}"

# Backend .env
if [ ! -f .env ]; then
    cp env.example .env
    echo -e "${GREEN}✅ Created .env file${NC}"
else
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
fi

# Frontend .env
if [ ! -f client/.env ]; then
    cat > client/.env << EOF
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000
REACT_APP_ENVIRONMENT=development
EOF
    echo -e "${GREEN}✅ Created client/.env file${NC}"
else
    echo -e "${YELLOW}⚠️  client/.env file already exists${NC}"
fi

# Mobile .env
if [ ! -f mobile/.env ]; then
    cat > mobile/.env << EOF
API_URL=http://localhost:5000/api
ENVIRONMENT=development
EOF
    echo -e "${GREEN}✅ Created mobile/.env file${NC}"
else
    echo -e "${YELLOW}⚠️  mobile/.env file already exists${NC}"
fi

# Create necessary directories
echo -e "${YELLOW}📁 Creating necessary directories...${NC}"
mkdir -p uploads logs nginx/ssl
mkdir -p client/public/images
mkdir -p mobile/android/app/src/main/assets

# Set permissions
echo -e "${YELLOW}🔐 Setting permissions...${NC}"
chmod 755 uploads logs
chmod 755 client/public/images
chmod 755 mobile/android/app/src/main/assets

# Install Truffle globally
echo -e "${YELLOW}📦 Installing Truffle globally...${NC}"
npm install -g truffle

# Install Ganache CLI globally
echo -e "${YELLOW}📦 Installing Ganache CLI globally...${NC}"
npm install -g ganache-cli

# Compile smart contracts
echo -e "${YELLOW}📜 Compiling smart contracts...${NC}"
truffle compile

# Create database indexes (if MongoDB is running)
echo -e "${YELLOW}🗄️  Setting up database...${NC}"
if command -v mongosh &> /dev/null; then
    echo -e "${YELLOW}Creating MongoDB indexes...${NC}"
    mongosh agrichain --eval "
        db.products.createIndex({ 'location.coordinates': '2dsphere' });
        db.products.createIndex({ name: 'text', variety: 'text', 'location.name': 'text' });
        db.users.createIndex({ email: 1 });
        db.users.createIndex({ walletAddress: 1 });
        print('Database indexes created successfully');
    " || echo -e "${YELLOW}⚠️  MongoDB not running. Please start MongoDB and run the index creation manually.${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB shell not found. Please install MongoDB and create indexes manually.${NC}"
fi

# Create systemd service files (Linux only)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo -e "${YELLOW}🔧 Creating systemd service files...${NC}"
    
    # Backend service
    sudo tee /etc/systemd/system/agrichain-backend.service > /dev/null << EOF
[Unit]
Description=AgriChain Backend API
After=network.target mongodb.service

[Service]
Type=simple
User=www-data
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    # Frontend service
    sudo tee /etc/systemd/system/agrichain-frontend.service > /dev/null << EOF
[Unit]
Description=AgriChain Frontend
After=network.target agrichain-backend.service

[Service]
Type=simple
User=www-data
WorkingDirectory=$(pwd)/client
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    echo -e "${GREEN}✅ Systemd service files created${NC}"
fi

# Generate SSL certificates for development
echo -e "${YELLOW}🔒 Generating SSL certificates for development...${NC}"
if command -v openssl &> /dev/null; then
    openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" 2>/dev/null || echo -e "${YELLOW}⚠️  SSL certificate generation failed${NC}"
else
    echo -e "${YELLOW}⚠️  OpenSSL not found. Please generate SSL certificates manually.${NC}"
fi

# Final instructions
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "${YELLOW}1. Start MongoDB:${NC} mongod --dbpath /path/to/your/db"
echo -e "${YELLOW}2. Start Ganache:${NC} ganache-cli"
echo -e "${YELLOW}3. Deploy contracts:${NC} truffle migrate"
echo -e "${YELLOW}4. Start backend:${NC} npm run server"
echo -e "${YELLOW}5. Start frontend:${NC} npm run client"
echo -e "${YELLOW}6. Start mobile:${NC} cd mobile && npm run android/ios"
echo ""
echo -e "${BLUE}🌐 URLs:${NC}"
echo -e "${GREEN}Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}Backend API: http://localhost:5000${NC}"
echo -e "${GREEN}API Documentation: http://localhost:5000/api-docs${NC}"
echo -e "${GREEN}Ganache: http://localhost:8545${NC}"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo -e "${YELLOW}README.md - Complete setup and usage guide${NC}"
echo -e "${YELLOW}docs/ - Detailed documentation${NC}"
echo ""
echo -e "${GREEN}Happy coding! 🌾${NC}"
