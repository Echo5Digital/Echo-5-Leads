'use client';

import { useRef, forwardRef, useImperativeHandle } from 'react';
import SignaturePad from 'react-signature-canvas';

/**
 * SignatureCanvas Component
 * 
 * A reusable signature canvas component that allows users to draw signatures
 * with mouse or touch input. Signatures are saved as base64 data URLs.
 * 
 * Props:
 * - onSave: Callback function that receives the signature data URL
 * - width: Canvas width (default: 500)
 * - height: Canvas height (default: 200)
 * - penColor: Signature pen color (default: 'black')
 */
const SignatureCanvas = forwardRef(({ onSave, width = 500, height = 200, penColor = 'black' }, ref) => {
  const sigPadRef = useRef(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    clear: () => {
      if (sigPadRef.current) {
        sigPadRef.current.clear();
      }
    },
    isEmpty: () => {
      if (sigPadRef.current) {
        return sigPadRef.current.isEmpty();
      }
      return true;
    },
    getDataURL: () => {
      if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
        // Compress signature as JPEG with 70% quality
        return sigPadRef.current.getTrimmedCanvas().toDataURL('image/jpeg', 0.7);
      }
      return null;
    }
  }));

  const handleClear = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear();
    }
  };

  const handleSave = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      // Get canvas and compress image
      const canvas = sigPadRef.current.getTrimmedCanvas();
      
      // Compress by reducing quality and converting to JPEG
      const dataURL = canvas.toDataURL('image/jpeg', 0.7); // 70% quality JPEG
      
      if (onSave) {
        onSave(dataURL);
      }
    }
  };

  return (
    <div className="signature-canvas-wrapper">
      <div className="border-2 border-gray-400 rounded-lg overflow-hidden bg-white">
        <SignaturePad
          ref={sigPadRef}
          canvasProps={{
            width: width,
            height: height,
            className: 'signature-canvas'
          }}
          penColor={penColor}
          backgroundColor="rgba(255, 255, 255, 1)"
        />
      </div>
      
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
        >
          Save Signature
        </button>
      </div>
      
      <p className="text-xs text-gray-600 mt-2">
        Draw your signature above using your mouse or touch screen
      </p>
    </div>
  );
});

SignatureCanvas.displayName = 'SignatureCanvas';

export default SignatureCanvas;
