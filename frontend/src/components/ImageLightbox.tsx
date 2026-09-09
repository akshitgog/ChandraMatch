import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';

interface ImageLightboxProps {
  src: string | null;
  fileName?: string;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  src,
  fileName,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!src) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4">
      {/* Top action bar */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
        <div className="text-white text-xs font-medium px-3 py-1.5 bg-white/10 rounded-xl backdrop-blur-md max-w-sm truncate">
          {fileName || 'Image Inspection'}
        </div>

        <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md p-1 rounded-xl text-white">
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.25))}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono px-2">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.min(4, prev + 0.25))}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-white/20 mx-1" />
          <button
            type="button"
            onClick={() => setRotation((prev) => (prev + 90) % 360)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="Rotate"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <a
            href={src}
            download={fileName || 'image.png'}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </a>
          <div className="w-[1px] h-4 bg-white/20 mx-1" />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/90 hover:text-white"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main viewer */}
      <div className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing">
        <img
          src={src}
          alt={fileName || 'Expanded view'}
          className="max-w-[90vw] max-h-[85vh] object-contain transition-transform duration-150 select-none shadow-2xl rounded-lg"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
          draggable={false}
        />
      </div>
    </div>
  );
};
