# AgriChain API Documentation

## Overview

The AgriChain API provides comprehensive endpoints for managing agricultural supply chain transparency using blockchain technology. The API is built with Node.js, Express, and MongoDB.

## Base URL

```
http://localhost:5000/api
```

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

## Error Format

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"]
}
```

## Endpoints

### Authentication

#### POST /auth/register
Register a new user.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "farmer",
  "organization": "Green Farm",
  "phone": "+1234567890",
  "address": {
    "street": "123 Farm Road",
    "city": "Farmville",
    "state": "CA",
    "country": "USA",
    "zipCode": "12345",
    "coordinates": {
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  },
  "walletAddress": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "farmer",
      "isVerified": false
    },
    "token": "jwt_token"
  }
}
```

#### POST /auth/login
Login user.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### GET /auth/me
Get current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

#### PUT /auth/profile
Update user profile.

**Headers:**
```
Authorization: Bearer <token>
```

### Products

#### GET /products
Get all products with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `category` (string): Filter by category
- `farmer` (string): Filter by farmer ID
- `verified` (boolean): Filter by verification status
- `search` (string): Search query
- `sortBy` (string): Sort field (default: createdAt)
- `sortOrder` (string): Sort order (asc/desc, default: desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "product_id",
        "name": "Organic Tomatoes",
        "category": "vegetables",
        "variety": "Cherry",
        "farmer": {
          "id": "farmer_id",
          "firstName": "John",
          "lastName": "Doe"
        },
        "harvestDate": "2024-01-15T00:00:00.000Z",
        "currentStatus": "harvested",
        "isVerified": true,
        "location": {
          "name": "Green Farm",
          "coordinates": {
            "latitude": 37.7749,
            "longitude": -122.4194
          }
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalProducts": 50,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### GET /products/:id
Get single product by ID.

#### POST /products
Create a new product.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Organic Tomatoes",
  "category": "vegetables",
  "variety": "Cherry",
  "harvestDate": "2024-01-15T00:00:00.000Z",
  "location": {
    "name": "Green Farm",
    "coordinates": {
      "latitude": 37.7749,
      "longitude": -122.4194
    },
    "address": {
      "street": "123 Farm Road",
      "city": "Farmville",
      "state": "CA",
      "country": "USA",
      "zipCode": "12345"
    }
  },
  "metadata": {
    "weight": 10.5,
    "batchNumber": "BATCH001",
    "packagingType": "Cardboard Box"
  }
}
```

#### PUT /products/:id
Update a product.

#### DELETE /products/:id
Delete a product (soft delete).

#### POST /products/:id/quality-check
Add quality check to product.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "score": 8,
  "notes": "Excellent quality, no defects found"
}
```

#### GET /products/:id/trace
Get product traceability information.

### Supply Chain

#### POST /supply-chain/transfer
Transfer product ownership in supply chain.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "productId": "product_id",
  "toUserId": "user_id",
  "toStatus": "processed",
  "location": "Processing Facility",
  "notes": "Transferred to processing",
  "temperature": 4,
  "humidity": 60
}
```

#### PUT /supply-chain/status
Update product status without transferring ownership.

#### GET /supply-chain/:productId/history
Get supply chain history for a product.

#### GET /supply-chain/my-products
Get products owned by current user.

#### GET /supply-chain/statistics
Get supply chain statistics.

### QR Codes

#### GET /qr/generate/:productId
Generate QR code for a product.

**Headers:**
```
Authorization: Bearer <token>
```

#### POST /qr/scan
Scan QR code and get product information.

**Request Body:**
```json
{
  "qrData": "qr_code_data_string"
}
```

#### GET /qr/validate/:productId
Validate QR code for a product.

#### POST /qr/batch-generate
Generate QR codes for multiple products.

### Certifications

#### POST /certification/add
Add certification to a product.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "productId": "product_id",
  "type": "organic",
  "certNumber": "CERT123456",
  "issuedDate": "2024-01-15T00:00:00.000Z",
  "expiryDate": "2025-01-15T00:00:00.000Z",
  "description": "USDA Organic Certification",
  "standards": "USDA Organic Standards"
}
```

#### GET /certification/:productId
Get certifications for a product.

#### GET /certification/verify/:certNumber
Verify a certification by certificate number.

### Analytics

#### GET /analytics/dashboard
Get dashboard analytics.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalProducts": 150,
      "verifiedProducts": 120,
      "verificationRate": 80.0,
      "totalInspected": 100
    },
    "statusDistribution": [
      {
        "_id": "harvested",
        "count": 50
      },
      {
        "_id": "processed",
        "count": 30
      }
    ],
    "categoryDistribution": [
      {
        "_id": "vegetables",
        "count": 80
      },
      {
        "_id": "fruits",
        "count": 70
      }
    ]
  }
}
```

#### GET /analytics/supply-chain-efficiency
Get supply chain efficiency metrics.

#### GET /analytics/quality-trends
Get quality trends and analysis.

#### GET /analytics/geographic
Get geographic distribution analytics.

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General endpoints**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 10 requests per 15 minutes per IP
- **File upload endpoints**: 20 requests per 15 minutes per IP

## Pagination

List endpoints support pagination with these parameters:

- `page`: Page number (starts from 1)
- `limit`: Number of items per page (max 100)

Response includes pagination metadata:

```json
{
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 100,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Filtering and Sorting

Many endpoints support filtering and sorting:

### Filtering
- Use query parameters to filter results
- Multiple filters can be combined
- Some filters support partial matching

### Sorting
- `sortBy`: Field to sort by
- `sortOrder`: `asc` or `desc` (default: `desc`)

### Search
- `search`: Text search across relevant fields
- Search is case-insensitive
- Supports partial matching

## Webhooks

The API supports webhooks for real-time notifications:

### Webhook Events
- `product.created`
- `product.updated`
- `product.transferred`
- `certification.added`
- `quality.check.completed`

### Webhook Payload
```json
{
  "event": "product.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "productId": "product_id",
    "farmerId": "farmer_id",
    "productName": "Organic Tomatoes"
  }
}
```

## SDKs and Libraries

### JavaScript/Node.js
```bash
npm install agrichain-sdk
```

```javascript
import { AgriChainAPI } from 'agrichain-sdk';

const api = new AgriChainAPI({
  baseURL: 'http://localhost:5000/api',
  apiKey: 'your-api-key'
});

const products = await api.products.getAll();
```

### Python
```bash
pip install agrichain-python
```

```python
from agrichain import AgriChainAPI

api = AgriChainAPI(
    base_url='http://localhost:5000/api',
    api_key='your-api-key'
)

products = api.products.get_all()
```

## Support

For API support and questions:

- **Email**: api-support@agrichain.com
- **Documentation**: https://docs.agrichain.com/api
- **GitHub Issues**: https://github.com/agrichain/api/issues
