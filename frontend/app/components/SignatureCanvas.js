'use client';

import { useRef, forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import SignaturePad from 'react-signature-canvas';

/**
 * SignatureCanvas Component
 * 
 * A reusable signature canvas component that allows users to draw signatures
 * with mouse or touch input. Signatures are saved as base64 data URLs.
 * 
 * Props:
 * - onSave: Callback function that receives the signature data URL
 * - width: Canvas width (default: 500) - will be responsive on mobile
 * - height: Canvas height (default: 200)
 * - penColor: Signature pen color (default: 'black')
 */
const SignatureCanvas = forwardRef(({ onSave, width = 500, height = 200, penColor = 'black' }, ref) => {
  const sigPadRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasWidth, setCanvasWidth] = useState(width);

  // Make canvas responsive
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        // Use container width minus padding, but don't exceed original width
        setCanvasWidth(Math.min(containerWidth - 4, width));
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [width]);

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
        // Use PNG format for better PDF compatibility
        return sigPadRef.current.getTrimmedCanvas().toDataURL('image/png');
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
      // Get canvas and save as PNG for better PDF compatibility
      const canvas = sigPadRef.current.getTrimmedCanvas();
      
      // Use PNG format for better compatibility with pdf-lib
      const dataURL = canvas.toDataURL('image/png');
      
      if (onSave) {
        onSave(dataURL);
      }
    }
  };

  return (
    <div className="signature-canvas-wrapper w-full" ref={containerRef}>
      <div className="border-2 border-gray-400 rounded-lg overflow-hidden bg-white">
        <SignaturePad
          ref={sigPadRef}
          canvasProps={{
            width: canvasWidth,
            height: Math.min(height, 150),
            className: 'signature-canvas w-full touch-none'
          }}
          penColor={penColor}
          backgroundColor="rgba(255, 255, 255, 1)"
        />
      </div>
      
      <div className="flex flex-wrap gap-2 mt-2">
        <button
          type="button"
          onClick={handleClear}
          className="px-3 sm:px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-xs sm:text-sm"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs sm:text-sm"
        >
          Save Signature
        </button>
      </div>
      
      <p className="text-xs text-gray-600 mt-2">
        Draw your signature above using your finger or stylus
      </p>
    </div>
  );
});

SignatureCanvas.displayName = 'SignatureCanvas';

export default SignatureCanvas;
