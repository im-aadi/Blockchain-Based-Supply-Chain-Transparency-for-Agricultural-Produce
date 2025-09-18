import React, { useState, useEffect } from 'react';
import './App-simple.css';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Demo login function
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'john@example.com',
          password: 'password123'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setUser(data.data.user);
        setIsLoggedIn(true);
        localStorage.setItem('token', data.data.token);
        await fetchProducts();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Fetch products
  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products');
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data.products);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  // Generate QR code
  const generateQR = async (productId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/qr/generate/${productId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        // Open QR code in new window
        const newWindow = window.open('', '_blank');
        newWindow.document.write(`
          <html>
            <head><title>QR Code - ${data.data.product.name}</title></head>
            <body style="text-align: center; padding: 20px;">
              <h2>QR Code for ${data.data.product.name}</h2>
              <img src="${data.data.qrCode}" alt="QR Code" style="max-width: 300px; border: 1px solid #ccc; padding: 10px;">
              <p>Product: ${data.data.product.name}</p>
              <p>Category: ${data.data.product.category}</p>
              <p>Harvest Date: ${new Date(data.data.product.harvestDate).toLocaleDateString()}</p>
            </body>
          </html>
        `);
      }
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  };

  // Scan QR code
  const scanQR = async () => {
    const qrData = prompt('Enter QR code data:');
    if (!qrData) return;

    try {
      const response = await fetch('http://localhost:5000/api/qr/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Product Found!\n\nName: ${data.data.product.name}\nCategory: ${data.data.product.category}\nStatus: ${data.data.product.currentStatus}\nVerified: ${data.data.product.isVerified ? 'Yes' : 'No'}\nFarmer: ${data.data.farmer.name}`);
      } else {
        alert('Failed to scan QR code: ' + data.message);
      }
    } catch (err) {
      alert('Failed to scan QR code');
    }
  };

  // Add new product
  const addProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const productData = {
      name: formData.get('name'),
      category: formData.get('category'),
      variety: formData.get('variety'),
      harvestDate: formData.get('harvestDate'),
      location: {
        name: formData.get('location'),
        coordinates: {
          latitude: parseFloat(formData.get('latitude')),
          longitude: parseFloat(formData.get('longitude'))
        }
      }
    };

    try {
      const response = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Product added successfully!');
        await fetchProducts();
        e.target.reset();
      } else {
        alert('Failed to add product: ' + data.message);
      }
    } catch (err) {
      alert('Failed to add product');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      setUser({ firstName: 'John', lastName: 'Doe', email: 'john@example.com', role: 'farmer' });
      fetchProducts();
    }
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="app">
        <div className="login-container">
          <div className="login-card">
            <div className="logo">
              <h1>🌾 AgriChain</h1>
              <p>Blockchain-Based Agricultural Supply Chain Transparency</p>
            </div>
            
            <form onSubmit={handleLogin} className="login-form">
              <h2>Sign In</h2>
              {error && <div className="error">{error}</div>}
              
              <div className="form-group">
                <label>Email:</label>
                <input type="email" defaultValue="john@example.com" required />
              </div>
              
              <div className="form-group">
                <label>Password:</label>
                <input type="password" defaultValue="password123" required />
              </div>
              
              <button type="submit" disabled={loading} className="login-btn">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            
            <div className="demo-info">
              <h3>Demo Credentials:</h3>
              <p>Email: john@example.com</p>
              <p>Password: password123</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>🌾 AgriChain Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {user?.firstName} {user?.lastName}</span>
            <button onClick={() => {
              localStorage.removeItem('token');
              setIsLoggedIn(false);
              setUser(null);
            }} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="dashboard">
          <div className="stats">
            <div className="stat-card">
              <h3>Total Products</h3>
              <p>{products.length}</p>
            </div>
            <div className="stat-card">
              <h3>Verified Products</h3>
              <p>{products.filter(p => p.isVerified).length}</p>
            </div>
            <div className="stat-card">
              <h3>Categories</h3>
              <p>{new Set(products.map(p => p.category)).size}</p>
            </div>
          </div>

          <div className="actions">
            <button onClick={scanQR} className="action-btn">📱 Scan QR Code</button>
            <button onClick={() => document.getElementById('addProductModal').style.display = 'block'} className="action-btn">➕ Add Product</button>
          </div>

          <div className="products-section">
            <h2>Products</h2>
            <div className="products-grid">
              {products.map(product => (
                <div key={product._id} className="product-card">
                  <h3>{product.name}</h3>
                  <p><strong>Category:</strong> {product.category}</p>
                  <p><strong>Variety:</strong> {product.variety}</p>
                  <p><strong>Status:</strong> {product.currentStatus}</p>
                  <p><strong>Verified:</strong> {product.isVerified ? '✅ Yes' : '❌ No'}</p>
                  <p><strong>Harvest Date:</strong> {new Date(product.harvestDate).toLocaleDateString()}</p>
                  <button onClick={() => generateQR(product._id)} className="qr-btn">
                    🔲 Generate QR Code
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Add Product Modal */}
      <div id="addProductModal" className="modal">
        <div className="modal-content">
          <span className="close" onClick={() => document.getElementById('addProductModal').style.display = 'none'}>&times;</span>
          <h2>Add New Product</h2>
          <form onSubmit={addProduct}>
            <div className="form-group">
              <label>Product Name:</label>
              <input type="text" name="name" required />
            </div>
            
            <div className="form-group">
              <label>Category:</label>
              <select name="category" required>
                <option value="">Select Category</option>
                <option value="vegetables">Vegetables</option>
                <option value="fruits">Fruits</option>
                <option value="grains">Grains</option>
                <option value="herbs">Herbs</option>
                <option value="spices">Spices</option>
                <option value="nuts">Nuts</option>
                <option value="legumes">Legumes</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Variety:</label>
              <input type="text" name="variety" required />
            </div>
            
            <div className="form-group">
              <label>Harvest Date:</label>
              <input type="date" name="harvestDate" required />
            </div>
            
            <div className="form-group">
              <label>Location:</label>
              <input type="text" name="location" placeholder="Farm name or location" required />
            </div>
            
            <div className="form-group">
              <label>Latitude:</label>
              <input type="number" name="latitude" step="any" placeholder="37.7749" required />
            </div>
            
            <div className="form-group">
              <label>Longitude:</label>
              <input type="number" name="longitude" step="any" placeholder="-122.4194" required />
            </div>
            
            <button type="submit" className="submit-btn">Add Product</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default App;
