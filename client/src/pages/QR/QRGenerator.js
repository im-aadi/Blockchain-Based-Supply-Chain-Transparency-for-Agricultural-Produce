import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { QrCode, Download, Search, Package, Loader2 } from 'lucide-react';
import { qrAPI, productsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ErrorMessage from '../../components/UI/ErrorMessage';
import toast from 'react-hot-toast';

const QRGenerator = () => {
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [generatedQR, setGeneratedQR] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch user's products
  const { data: products, isLoading, error } = useQuery(
    'my-products',
    () => productsAPI.getByFarmer(user?._id).then(res => res.data.data.products),
    {
      enabled: !!user?._id,
    }
  );

  const handleGenerateQR = async (productId) => {
    setIsGenerating(true);
    try {
      const response = await qrAPI.generate(productId);
      const qrData = response.data.data;
      setGeneratedQR(qrData);
      toast.success('QR code generated successfully!');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to generate QR code';
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadQR = () => {
    if (generatedQR?.qrCode) {
      const link = document.createElement('a');
      link.download = `qr-code-${selectedProduct?.name || 'product'}.png`;
      link.href = generatedQR.qrCode;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('QR code downloaded!');
    }
  };

  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message="Failed to load products" />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <QrCode className="h-8 w-8 text-indigo-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">QR Code Generator</h1>
            <p className="text-gray-600">Generate QR codes for your products</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Product</h2>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>

          {/* Products List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No products found</p>
                {searchQuery && (
                  <p className="text-sm">Try adjusting your search terms</p>
                )}
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product._id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedProduct?._id === product._id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">
                        {product.category} • {product.variety}
                      </p>
                      <div className="flex items-center mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium status-${product.currentStatus}`}>
                          {product.currentStatus.replace('-', ' ')}
                        </span>
                        {product.isVerified && (
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(product.harvestDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {product.ageInDays} days old
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* QR Code Generation */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate QR Code</h2>
          
          {!selectedProduct ? (
            <div className="text-center py-8 text-gray-500">
              <QrCode className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Select a product to generate QR code</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Product Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900">{selectedProduct.name}</h3>
                <p className="text-sm text-gray-500 capitalize">
                  {selectedProduct.category} • {selectedProduct.variety}
                </p>
                <p className="text-sm text-gray-500">
                  Harvested: {new Date(selectedProduct.harvestDate).toLocaleDateString()}
                </p>
              </div>

              {/* Generate Button */}
              <button
                onClick={() => handleGenerateQR(selectedProduct._id)}
                disabled={isGenerating}
                className="btn btn-primary w-full flex items-center justify-center"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate QR Code
                  </>
                )}
              </button>

              {/* Generated QR Code */}
              {generatedQR && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="font-medium text-gray-900 mb-2">Generated QR Code</h3>
                    <div className="inline-block p-4 bg-white border border-gray-200 rounded-lg">
                      <img
                        src={generatedQR.qrCode}
                        alt="Generated QR Code"
                        className="w-48 h-48"
                      />
                    </div>
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={handleDownloadQR}
                    className="btn btn-outline w-full flex items-center justify-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download QR Code
                  </button>

                  {/* QR Code Data */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">QR Code Data</h4>
                    <p className="text-sm text-gray-600 font-mono break-all">
                      {generatedQR.qrCode}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Batch Generation */}
      {products && products.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Batch Generation</h2>
          <p className="text-gray-600 mb-4">
            Generate QR codes for multiple products at once. This is useful for printing labels.
          </p>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                {products.length} products available for batch generation
              </p>
            </div>
            <button
              onClick={async () => {
                setIsGenerating(true);
                try {
                  const productIds = products.map(p => p._id);
                  const response = await qrAPI.batchGenerate({ productIds });
                  const qrCodes = response.data.data.qrCodes;
                  
                  // Create a zip file or download individual QR codes
                  toast.success(`Generated ${qrCodes.length} QR codes!`);
                } catch (error) {
                  const message = error.response?.data?.message || 'Failed to generate batch QR codes';
                  toast.error(message);
                } finally {
                  setIsGenerating(false);
                }
              }}
              disabled={isGenerating}
              className="btn btn-primary flex items-center"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate All QR Codes
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRGenerator;
