import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Layout Components
import Layout from './components/Layout/Layout';
import AuthLayout from './components/Layout/AuthLayout';

// Auth Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Signup from './pages/Signup';

// Dashboard Pages
import Dashboard from './pages/Dashboard/Dashboard';
import Products from './pages/Products/Products';
import ProductDetail from './pages/Products/ProductDetail';
import AddProduct from './pages/Products/AddProduct';
import EditProduct from './pages/Products/EditProduct';

// Supply Chain Pages
import SupplyChain from './pages/SupplyChain/SupplyChain';
import ProductTrace from './pages/SupplyChain/ProductTrace';
import MyProducts from './pages/SupplyChain/MyProducts';

// QR Code Pages
import QRScanner from './pages/QR/QRScanner';
import QRGenerator from './pages/QR/QRGenerator';

// Certification Pages
import Certifications from './pages/Certifications/Certifications';
import AddCertification from './pages/Certifications/AddCertification';

// Analytics Pages
import Analytics from './pages/Analytics/Analytics';

// Profile Pages
import Profile from './pages/Profile/Profile';
import Settings from './pages/Profile/Settings';

// Error Pages
import NotFound from './pages/Error/NotFound';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner h-8 w-8"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner h-8 w-8"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <AuthLayout>
                    <Login />
                  </AuthLayout>
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <AuthLayout>
                    <Register />
                  </AuthLayout>
                </PublicRoute>
              }
            />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Products Routes */}
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Products />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProductDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/add"
              element={
                <ProtectedRoute requiredRole="farmer">
                  <Layout>
                    <AddProduct />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/:id/edit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EditProduct />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Supply Chain Routes */}
            <Route
              path="/supply-chain"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SupplyChain />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/supply-chain/trace/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProductTrace />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/supply-chain/my-products"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MyProducts />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* QR Code Routes */}
            <Route
              path="/qr/scanner"
              element={
                <ProtectedRoute>
                  <Layout>
                    <QRScanner />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/qr/generator"
              element={
                <ProtectedRoute>
                  <Layout>
                    <QRGenerator />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Certification Routes */}
            <Route
              path="/certifications"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Certifications />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/certifications/add"
              element={
                <ProtectedRoute requiredRole="certifier">
                  <Layout>
                    <AddCertification />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Analytics Routes */}
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Analytics />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Profile Routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

// Example link to signup page
<a href="/signup">Sign Up</a>
