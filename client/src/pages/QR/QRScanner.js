import React, { useState, useRef, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { qrAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const QRScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      // Cleanup scanner when component unmounts
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, []);

  const startScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
    }

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        qrbox: { width: 250, height: 250 },
        fps: 5,
        aspectRatio: 1.0,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        handleScanResult(decodedText);
        scanner.clear();
        setIsScanning(false);
      },
      (error) => {
        // Handle scan error (usually just means no QR code detected)
        console.log('QR Code scan error:', error);
      }
    );

    scannerRef.current = scanner;
    setIsScanning(true);
    setError(null);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScanResult = async (qrData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await qrAPI.scan({ qrData });
      const productData = response.data.data;
      
      setScanResult(productData);
      toast.success('QR code scanned successfully!');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to scan QR code';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualInput = (event) => {
    const value = event.target.value;
    if (value.length > 10) {
      handleScanResult(value);
    }
  };

  const viewProductDetails = (productId) => {
    navigate(`/products/${productId}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <QrCode className="h-8 w-8 text-indigo-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">QR Code Scanner</h1>
            <p className="text-gray-600">Scan product QR codes to view traceability information</p>
          </div>
        </div>
      </div>

      {/* Scanner Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Scan QR Code</h2>
            <p className="text-gray-600 text-sm">
              Use your camera to scan a product QR code or enter the code manually
            </p>
          </div>
          
          <div className="flex gap-3">
            {!isScanning ? (
              <button
                onClick={startScanner}
                className="btn btn-primary flex items-center"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Start Scanner
              </button>
            ) : (
              <button
                onClick={stopScanner}
                className="btn btn-secondary flex items-center"
              >
                Stop Scanner
              </button>
            )}
          </div>
        </div>

        {/* Manual Input */}
        <div className="mt-4">
          <label htmlFor="manual-input" className="block text-sm font-medium text-gray-700 mb-2">
            Or enter QR code manually:
          </label>
          <input
            id="manual-input"
            type="text"
            placeholder="Paste QR code data here..."
            onChange={handleManualInput}
            className="input w-full"
          />
        </div>
      </div>

      {/* Scanner */}
      {isScanning && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Camera Scanner</h3>
          <div id="qr-reader" className="w-full"></div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin h-8 w-8 text-indigo-600 mr-3" />
            <span className="text-gray-600">Processing QR code...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-8">
            <AlertCircle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Scan Failed</h3>
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Scan Result */}
      {scanResult && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Product Found</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Information */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">Product Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{scanResult.product.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium capitalize">{scanResult.product.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Variety:</span>
                  <span className="font-medium">{scanResult.product.variety}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium status-${scanResult.product.currentStatus}`}>
                    {scanResult.product.currentStatus.replace('-', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Verified:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${scanResult.product.isVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {scanResult.product.isVerified ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Age:</span>
                  <span className="font-medium">{scanResult.product.ageInDays} days</span>
                </div>
              </div>
            </div>

            {/* Farmer Information */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">Farmer Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{scanResult.farmer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Organization:</span>
                  <span className="font-medium">{scanResult.farmer.organization || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-sm">{scanResult.farmer.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{scanResult.farmer.phone || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Supply Chain History */}
          {scanResult.supplyChain && scanResult.supplyChain.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-3">Supply Chain History</h4>
              <div className="space-y-3">
                {scanResult.supplyChain.map((entry, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium">{entry.from}</span>
                        <span className="text-gray-500 mx-2">→</span>
                        <span className="font-medium">{entry.to}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{entry.fromStatus} → {entry.toStatus}</span>
                      <span>{entry.location}</span>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-gray-500 mt-2">{entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {scanResult.certifications && scanResult.certifications.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-3">Certifications</h4>
              <div className="flex flex-wrap gap-2">
                {scanResult.certifications.map((cert, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                  >
                    {cert.type.replace('-', ' ').toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => viewProductDetails(scanResult.product.id)}
              className="btn btn-primary"
            >
              View Full Details
            </button>
            <button
              onClick={() => {
                setScanResult(null);
                setError(null);
              }}
              className="btn btn-outline"
            >
              Scan Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanner;
