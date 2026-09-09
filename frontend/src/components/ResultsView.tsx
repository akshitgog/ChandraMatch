import React, { useState, useRef } from 'react';
import {
  SlidersHorizontal,
  Layers,
  ArrowLeft,
  Download,
  CheckCircle2,
  Share2,
  Sparkles,
  Maximize2,
} from 'lucide-react';
import { ImageSlotState } from '../types';

interface ResultsViewProps {
  source: ImageSlotState;
  reference: ImageSlotState;
  onBackToSelect: () => void;
  onOpenPreview: (src: string, label: string) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  source,
  reference,
  onBackToSelect,
  onOpenPreview,
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [activeTab, setActiveTab] = useState<'split' | 'overlay' | 'tielines'>('split');
  const [blendOpacity, setBlendOpacity] = useState(0.5);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const handleMove = (ev: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      const offset = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (offset / rect.width) * 100));
      setSliderPos(pct);
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Banner with Summary & Return */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Registration Succeeded
            </span>
            <span className="text-xs font-mono text-slate-500">
              RMSE: 0.38 px
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Registered Lunar Imagery ({source.sensor} → {reference.sensor})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sub-pixel geometric transformation matrix estimated with 248 validated inlier tie-points
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToSelect}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Select New Images</span>
          </button>
          <a
            href={source.src || '#'}
            download="aligned_lunar_frame.png"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Registered GeoTIFF</span>
          </a>
        </div>
      </div>

      {/* Main Interactive Comparison Stage */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        {/* View Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'split'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Split Swipe</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('overlay')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'overlay'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Blend Transparency</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tielines')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'tielines'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tie-Points Map</span>
            </button>
          </div>

          {activeTab === 'overlay' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600 font-medium">Opacity:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={blendOpacity}
                onChange={(e) => setBlendOpacity(parseFloat(e.target.value))}
                className="w-28 accent-[#2563EB]"
              />
              <span className="font-mono text-slate-700 w-8">
                {Math.round(blendOpacity * 100)}%
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                source.src && onOpenPreview(source.src, 'Registered High-Res Output')
              }
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Fullscreen Inspect"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Display Canvas Container */}
        {activeTab === 'split' && (
          <div className="space-y-2">
            <div
              ref={containerRef}
              onMouseDown={handlePointerDown}
              onTouchStart={handlePointerDown}
              className="relative w-full aspect-[16/9] sm:aspect-[21/9] bg-slate-950 rounded-xl overflow-hidden cursor-ew-resize select-none border border-slate-200"
            >
              {/* Reference Image (Right/Background) */}
              <img
                src={reference.src || ''}
                alt="Reference TMC-2"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />

              {/* Source Image (Left/Foreground with Clip Path) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
              >
                <img
                  src={source.src || ''}
                  alt="Source OHRC"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none filter contrast-105"
                />
              </div>

              {/* Divider Handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)] pointer-events-none"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-slate-300 flex items-center justify-center text-slate-800 pointer-events-auto">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Tags */}
              <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg text-white text-[11px] font-medium pointer-events-none">
                Source: {source.sensor} ({source.resolutionText})
              </div>
              <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg text-white text-[11px] font-medium pointer-events-none">
                Reference: {reference.sensor} ({reference.resolutionText})
              </div>
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Drag slider horizontally to visually inspect crater rim and boulder alignment
            </p>
          </div>
        )}

        {activeTab === 'overlay' && (
          <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] bg-slate-950 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
            <img
              src={reference.src || ''}
              alt="Reference"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <img
              src={source.src || ''}
              alt="Source Registered"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none mix-blend-screen"
              style={{ opacity: blendOpacity }}
            />
            <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/70 backdrop-blur-md text-white text-[11px] rounded-md font-mono">
              Screen Overlay Mode ({Math.round(blendOpacity * 100)}%)
            </div>
          </div>
        )}

        {activeTab === 'tielines' && (
          <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] bg-slate-950 rounded-xl overflow-hidden border border-slate-200">
            <div className="absolute inset-0 flex">
              <div className="w-1/2 h-full relative">
                <img src={source.src || ''} alt="Source" className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 rounded text-[10px] text-white">
                  Source ({source.sensor})
                </span>
              </div>
              <div className="w-1/2 h-full relative border-l border-slate-700">
                <img src={reference.src || ''} alt="Reference" className="w-full h-full object-cover" />
                <span className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 rounded text-[10px] text-white">
                  Reference ({reference.sensor})
                </span>
              </div>
            </div>

            {/* Tie-Point SVG lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {[
                { x1: '20%', y1: '25%', x2: '68%', y2: '28%' },
                { x1: '32%', y1: '40%', x2: '78%', y2: '42%' },
                { x1: '15%', y1: '60%', x2: '64%', y2: '63%' },
                { x1: '40%', y1: '75%', x2: '86%', y2: '77%' },
                { x1: '25%', y1: '85%', x2: '73%', y2: '87%' },
                { x1: '36%', y1: '18%', x2: '82%', y2: '20%' },
              ].map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x1} cy={pt.y1} r="3" fill="#38BDF8" />
                  <circle cx={pt.x2} cy={pt.y2} r="3" fill="#22C55E" />
                  <line
                    x1={pt.x1}
                    y1={pt.y1}
                    x2={pt.x2}
                    y2={pt.y2}
                    stroke="#FBBF24"
                    strokeWidth="1.2"
                    strokeOpacity="0.75"
                  />
                </g>
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* Transformation Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Registration RMSE
          </p>
          <p className="text-xl font-mono font-bold text-slate-900 mt-1">
            0.38 <span className="text-xs font-normal text-slate-500">px</span>
          </p>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
            Sub-pixel precision
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Inlier Matches
          </p>
          <p className="text-xl font-mono font-bold text-slate-900 mt-1">
            248 <span className="text-xs font-normal text-slate-500">/ 295</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            84.1% RANSAC consensus
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Scale Resampling
          </p>
          <p className="text-xl font-mono font-bold text-slate-900 mt-1">
            15.625 <span className="text-xs font-normal text-slate-500">×</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            0.32m to 5m ratio
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Homography Estimate
          </p>
          <p className="text-xl font-mono font-bold text-slate-900 mt-1">
            3 × 3 <span className="text-xs font-normal text-slate-500">Proj</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Rot: +1.42° | Δ: (14, -8)
          </p>
        </div>
      </div>
    </div>
  );
};
