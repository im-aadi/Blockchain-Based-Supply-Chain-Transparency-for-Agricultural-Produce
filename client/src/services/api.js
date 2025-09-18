import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = api;

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  search: (query, params) => api.get('/products/search', { params: { q: query, ...params } }),
  getByFarmer: (farmerId, params) => api.get(`/products/farmer/${farmerId}`, { params }),
  addQualityCheck: (id, data) => api.post(`/products/${id}/quality-check`, data),
  getTrace: (id) => api.get(`/products/${id}/trace`),
};

// Supply Chain API
export const supplyChainAPI = {
  transfer: (data) => api.post('/supply-chain/transfer', data),
  updateStatus: (data) => api.put('/supply-chain/status', data),
  getHistory: (productId) => api.get(`/supply-chain/${productId}/history`),
  getMyProducts: (params) => api.get('/supply-chain/my-products', { params }),
  getStatistics: () => api.get('/supply-chain/statistics'),
  getEfficiency: () => api.get('/supply-chain/efficiency'),
};

// QR Code API
export const qrAPI = {
  generate: (productId) => api.get(`/qr/generate/${productId}`),
  scan: (data) => api.post('/qr/scan', data),
  validate: (productId) => api.get(`/qr/validate/${productId}`),
  batchGenerate: (data) => api.post('/qr/batch-generate', data),
};

// Certification API
export const certificationAPI = {
  add: (data) => api.post('/certification/add', data),
  update: (productId, certId, data) => api.put(`/certification/${productId}/${certId}`, data),
  delete: (productId, certId) => api.delete(`/certification/${productId}/${certId}`),
  getByProduct: (productId) => api.get(`/certification/${productId}`),
  verify: (certNumber) => api.get(`/certification/verify/${certNumber}`),
  getTypes: () => api.get('/certification/types'),
  getMyCertifications: (params) => api.get('/certification/my-certifications', { params }),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getSupplyChainEfficiency: () => api.get('/analytics/supply-chain-efficiency'),
  getQualityTrends: () => api.get('/analytics/quality-trends'),
  getGeographic: () => api.get('/analytics/geographic'),
  export: (params) => api.get('/analytics/export', { params }),
};

// File Upload API
export const uploadAPI = {
  uploadImage: (file, onProgress) => {
    const formData = new FormData();
    formData.append('image', file);
    
    return api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
  },
};

export default api;
