'use client';

import { useState, useRef } from 'react';
import SignatureCanvas from '../components/SignatureCanvas';

/**
 * Test page for signature canvas functionality
 * Navigate to /test-signature to test the signature feature
 */
export default function TestSignaturePage() {
  const [signature, setSignature] = useState('');
  const [signatureDate, setSignatureDate] = useState('');
  const signatureRef = useRef(null);

  const handleSave = (dataURL) => {
    setSignature(dataURL);
    setSignatureDate(new Date().toLocaleString());
  };

  const handleClear = () => {
    setSignature('');
    setSignatureDate('');
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Signature Canvas Test
        </h1>
        <p className="text-gray-600 mb-8">
          Test the signature functionality before using it in production forms
        </p>

        {/* Signature Canvas */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Draw Your Signature
          </h2>
          <SignatureCanvas
            ref={signatureRef}
            width={600}
            height={200}
            onSave={handleSave}
          />
        </div>

        {/* Clear All Button */}
        <div className="mb-8">
          <button
            onClick={handleClear}
            className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Clear All
          </button>
        </div>

        {/* Signature Preview */}
        {signature && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Saved Signature Preview
            </h2>
            <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
              <img 
                src={signature} 
                alt="Saved signature" 
                className="max-w-full h-auto border border-gray-300 bg-white"
              />
              <p className="text-sm text-gray-600 mt-2">
                Saved at: {signatureDate}
              </p>
            </div>
          </div>
        )}

        {/* Data URL Preview */}
        {signature && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Base64 Data URL (First 200 characters)
            </h2>
            <div className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
              <code className="text-xs text-gray-700 break-all">
                {signature.substring(0, 200)}...
              </code>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Total length: {signature.length} characters
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Testing Instructions
          </h3>
          <ul className="list-disc list-inside space-y-2 text-blue-800">
            <li>Draw your signature in the canvas above using your mouse or touch screen</li>
            <li>Click "Save Signature" to capture the signature</li>
            <li>The signature will appear below as a preview</li>
            <li>The base64 data URL will be displayed (this is what gets saved to the database)</li>
            <li>Click "Clear" to erase the canvas and start over</li>
            <li>Click "Clear All" to reset everything including the saved signature</li>
            <li>Test on both desktop (mouse) and mobile (touch) devices</li>
          </ul>
        </div>

        {/* Device Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Device Information
          </h3>
          <p className="text-xs text-gray-600">
            User Agent: {typeof window !== 'undefined' ? window.navigator.userAgent : 'Loading...'}
          </p>
        </div>
      </div>
    </div>
  );
}
