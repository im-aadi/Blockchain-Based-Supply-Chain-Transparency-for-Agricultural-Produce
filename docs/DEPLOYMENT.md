# AgriChain Deployment Guide

This guide covers deploying the AgriChain blockchain-based agricultural supply chain platform in various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **npm**: 8.x or higher
- **MongoDB**: 5.0 or higher
- **Docker**: 20.x or higher (for containerized deployment)
- **Docker Compose**: 2.x or higher
- **Git**: 2.x or higher

### Blockchain Requirements

- **Ganache**: For local development
- **Truffle**: For smart contract deployment
- **MetaMask**: For blockchain interaction
- **Web3 Provider**: Infura, Alchemy, or local node

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/your-org/agrichain.git
cd agrichain
```

### 2. Run Setup Script

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 3. Start Services

```bash
# Start MongoDB
mongod --dbpath /path/to/your/db

# Start Ganache (in another terminal)
ganache-cli

# Deploy smart contracts
truffle migrate

# Start backend (in another terminal)
npm run server

# Start frontend (in another terminal)
npm run client
```

### 4. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs
- **Ganache**: http://localhost:8545

## Docker Deployment

### 1. Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/agrichain.git
cd agrichain

# Deploy with Docker Compose
docker-compose up -d

# Check status
docker-compose ps
```

### 2. Custom Configuration

Edit `docker-compose.yml` to customize:

```yaml
services:
  backend:
    environment:
      MONGODB_URI: mongodb://admin:password@mongodb:27017/agrichain
      JWT_SECRET: your-secret-key
      NODE_ENV: production
```

### 3. SSL Configuration

```bash
# Generate SSL certificates
mkdir -p nginx/ssl
openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -days 365 -nodes

# Update nginx configuration
cp nginx/nginx-ssl.conf nginx/nginx.conf
```

### 4. Data Persistence

```bash
# Create named volumes
docker volume create agrichain_mongodb_data
docker volume create agrichain_redis_data

# Update docker-compose.yml
volumes:
  mongodb_data:
    external: true
  redis_data:
    external: true
```

## Production Deployment

### 1. Server Setup

#### Ubuntu/Debian

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### CentOS/RHEL

```bash
# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install MongoDB
sudo vim /etc/yum.repos.d/mongodb-org-6.0.repo
# Add MongoDB repository configuration

sudo yum install -y mongodb-org
```

### 2. Application Deployment

```bash
# Clone repository
git clone https://github.com/your-org/agrichain.git
cd agrichain

# Set production environment
export NODE_ENV=production

# Install dependencies
npm ci --production

# Build frontend
cd client
npm ci
npm run build
cd ..

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Nginx Configuration

```nginx
# /etc/nginx/sites-available/agrichain
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. SSL Certificate

#### Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Custom Certificate

```bash
# Generate private key
openssl genrsa -out private.key 2048

# Generate certificate signing request
openssl req -new -key private.key -out cert.csr

# Generate self-signed certificate (for testing)
openssl x509 -req -days 365 -in cert.csr -signkey private.key -out cert.pem
```

### 5. Process Management

#### PM2

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'agrichain-backend',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Systemd

```bash
# Create service file
sudo tee /etc/systemd/system/agrichain.service << EOF
[Unit]
Description=AgriChain Application
After=network.target mongodb.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/agrichain
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable agrichain
sudo systemctl start agrichain
```

## Cloud Deployment

### AWS

#### EC2 Deployment

```bash
# Launch EC2 instance (Ubuntu 20.04 LTS)
# Security groups: HTTP (80), HTTPS (443), SSH (22), Custom (5000, 3000)

# Connect to instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Follow production deployment steps
```

#### ECS Deployment

```bash
# Build and push Docker images
aws ecr create-repository --repository-name agrichain-backend
aws ecr create-repository --repository-name agrichain-frontend

# Tag and push images
docker tag agrichain-backend:latest your-account.dkr.ecr.region.amazonaws.com/agrichain-backend:latest
docker push your-account.dkr.ecr.region.amazonaws.com/agrichain-backend:latest
```

#### RDS for MongoDB

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier agrichain-mongodb \
  --db-instance-class db.t3.micro \
  --engine docdb \
  --master-username admin \
  --master-user-password your-password
```

### Google Cloud Platform

#### Compute Engine

```bash
# Create VM instance
gcloud compute instances create agrichain-vm \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --machine-type=e2-medium \
  --zone=us-central1-a

# Deploy application
gcloud compute scp --recurse ./agrichain agrichain-vm:~/ --zone=us-central1-a
```

#### Cloud Run

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/your-project/agrichain-backend
gcloud run deploy agrichain-backend --image gcr.io/your-project/agrichain-backend --platform managed
```

### Azure

#### App Service

```bash
# Create resource group
az group create --name agrichain-rg --location eastus

# Create App Service plan
az appservice plan create --name agrichain-plan --resource-group agrichain-rg --sku B1

# Create web app
az webapp create --name agrichain-app --resource-group agrichain-rg --plan agrichain-plan --runtime "NODE|18-lts"
```

## Monitoring and Maintenance

### 1. Health Checks

```bash
# Backend health check
curl http://localhost:5000/health

# Frontend health check
curl http://localhost:3000

# Database health check
mongosh --eval "db.runCommand('ping')"
```

### 2. Logging

```bash
# View application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# View system logs
journalctl -u agrichain -f
```

### 3. Backup

```bash
# MongoDB backup
mongodump --uri="mongodb://localhost:27017/agrichain" --out=/backup/agrichain-$(date +%Y%m%d)

# Automated backup script
cat > backup.sh << EOF
#!/bin/bash
BACKUP_DIR="/backup/agrichain"
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="mongodb://localhost:27017/agrichain" --out="$BACKUP_DIR/$DATE"
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;
EOF

chmod +x backup.sh
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

### 4. Updates

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm update

# Rebuild and restart
docker-compose down
docker-compose up --build -d
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Find process using port
lsof -i :5000
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### 2. Database Connection Issues

```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo journalctl -u mongod -f

# Test connection
mongosh --eval "db.runCommand('ping')"
```

#### 3. Docker Issues

```bash
# Clean up Docker
docker system prune -a

# Rebuild containers
docker-compose down
docker-compose up --build -d
```

#### 4. Memory Issues

```bash
# Check memory usage
free -h
docker stats

# Increase swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Performance Optimization

#### 1. Database Indexing

```javascript
// Create indexes
db.products.createIndex({ "location.coordinates": "2dsphere" });
db.products.createIndex({ name: "text", variety: "text" });
db.users.createIndex({ email: 1 });
```

#### 2. Caching

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo vim /etc/redis/redis.conf
# Set: maxmemory 256mb
# Set: maxmemory-policy allkeys-lru
```

#### 3. CDN Setup

```bash
# Configure CloudFlare or AWS CloudFront
# Update DNS settings
# Enable caching for static assets
```

### Security Considerations

#### 1. Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# iptables
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

#### 2. SSL/TLS Configuration

```nginx
# Strong SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

#### 3. Environment Variables

```bash
# Secure environment variables
export JWT_SECRET="your-super-secret-jwt-key"
export MONGODB_URI="mongodb://username:password@localhost:27017/agrichain"
export NODE_ENV="production"
```

## Support

For deployment support:

- **Email**: support@agrichain.com
- **Documentation**: https://docs.agrichain.com
- **GitHub Issues**: https://github.com/agrichain/agrichain/issues
- **Discord**: https://discord.gg/agrichain
