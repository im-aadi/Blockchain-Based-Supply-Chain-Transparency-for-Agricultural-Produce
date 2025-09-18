#!/bin/bash

# AgriChain Deployment Script
# This script deploys the AgriChain application to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="agrichain"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENVIRONMENT=${1:-production}

echo -e "${GREEN}🚀 Starting AgriChain deployment...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Create necessary directories
echo -e "${YELLOW}📁 Creating necessary directories...${NC}"
mkdir -p uploads logs nginx/ssl

# Set proper permissions
echo -e "${YELLOW}🔐 Setting permissions...${NC}"
chmod 755 uploads logs
chmod 600 nginx/ssl/* 2>/dev/null || true

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f $DOCKER_COMPOSE_FILE down || true

# Remove old images (optional)
if [ "$2" = "--clean" ]; then
    echo -e "${YELLOW}🧹 Cleaning up old images...${NC}"
    docker system prune -f
fi

# Build and start services
echo -e "${YELLOW}🔨 Building and starting services...${NC}"
docker-compose -f $DOCKER_COMPOSE_FILE up --build -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Health check
echo -e "${YELLOW}🏥 Performing health checks...${NC}"

# Check MongoDB
if docker-compose -f $DOCKER_COMPOSE_FILE exec -T mongodb mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MongoDB is healthy${NC}"
else
    echo -e "${RED}❌ MongoDB health check failed${NC}"
    exit 1
fi

# Check Backend API
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API is healthy${NC}"
else
    echo -e "${RED}❌ Backend API health check failed${NC}"
    exit 1
fi

# Check Frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
    exit 1
fi

# Deploy smart contracts (if in development)
if [ "$ENVIRONMENT" = "development" ]; then
    echo -e "${YELLOW}📜 Deploying smart contracts...${NC}"
    docker-compose -f $DOCKER_COMPOSE_FILE exec backend npm run deploy:contracts || true
fi

# Show running containers
echo -e "${GREEN}📊 Running containers:${NC}"
docker-compose -f $DOCKER_COMPOSE_FILE ps

# Show logs
echo -e "${GREEN}📋 Recent logs:${NC}"
docker-compose -f $DOCKER_COMPOSE_FILE logs --tail=20

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}🔧 Backend API: http://localhost:5000${NC}"
echo -e "${GREEN}🗄️  MongoDB: mongodb://localhost:27017${NC}"
echo -e "${GREEN}⛓️  Ganache: http://localhost:8545${NC}"

# Optional: Open browser
if command -v xdg-open &> /dev/null; then
    echo -e "${YELLOW}🌐 Opening browser...${NC}"
    xdg-open http://localhost:3000
elif command -v open &> /dev/null; then
    echo -e "${YELLOW}🌐 Opening browser...${NC}"
    open http://localhost:3000
fi
