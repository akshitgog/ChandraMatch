import React, { useRef, useState, useMemo } from 'react';
import {
  UploadCloud,
  ChevronDown,
  Layers,
  X,
  Maximize2,
  Check,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MoveHorizontal,
  MoveVertical,
  Scan,
} from 'lucide-react';
import { ImageSlotState, SensorType, FitMode } from '../types';
import { LUNAR_SENSORS } from '../data/lunarSensors';

interface ImageDropzoneCardProps {
  slot: ImageSlotState;
  title: string;
  onFileSelect: (file: File) => void;
  onSelectSensor: (sensor: SensorType) => void;
  onClear: () => void;
  onLoadSample: () => void;
  onPreviewClick: () => void;
  onFitModeChange?: (mode: FitMode) => void;
}

export const ImageDropzoneCard: React.FC<ImageDropzoneCardProps> = ({
  slot,
  title,
  onFileSelect,
  onSelectSensor,
  onClear,
  onLoadSample,
  onPreviewClick,
  onFitModeChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [localFitMode, setLocalFitMode] = useState<FitMode>(slot.fitMode || 'adaptive');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (
        file.type.startsWith('image/') ||
        file.name.endsWith('.tif') ||
        file.name.endsWith('.tiff') ||
        file.name.endsWith('.img')
      ) {
        onFileSelect(file);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
    e.target.value = '';
  };

  const changeFitMode = (mode: FitMode) => {
    setLocalFitMode(mode);
    setZoomLevel(1);
    if (onFitModeChange) {
      onFitModeChange(mode);
    }
  };

  // Compute aspect ratio characteristics
  const aspectInfo = useMemo(() => {
    if (!slot.width || !slot.height) {
      return { ratio: 1.33, isTallStrip: false, isWideStrip: false, label: 'Standard' };
    }
    const ratio = slot.width / slot.height;
    const isTallStrip = ratio < 0.75;
    const isWideStrip = ratio > 1.7;

    let label = 'Standard';
    if (ratio <= 0.4) label = `Ultra-tall Strip (1:${(1 / ratio).toFixed(1)})`;
    else if (isTallStrip) label = `Tall Strip (1:${(1 / ratio).toFixed(1)})`;
    else if (ratio >= 2.4) label = `Ultra-wide Swath (${ratio.toFixed(1)}:1)`;
    else if (isWideStrip) label = `Wide Swath (${ratio.toFixed(1)}:1)`;
    else if (Math.abs(ratio - 1) < 0.1) label = 'Square (1:1)';

    return { ratio, isTallStrip, isWideStrip, label };
  }, [slot.width, slot.height]);

  // Container height / aspect styling based on fitMode and image aspect ratio
  const containerStyle = useMemo(() => {
    if (!slot.src) {
      return { height: '320px' };
    }

    if (localFitMode === 'contain') {
      return { height: '360px' };
    }

    if (localFitMode === 'scrollable') {
      return { height: aspectInfo.isTallStrip ? '440px' : '380px' };
    }

    // 'adaptive' mode: container dynamically adjusts height to fit strip or wide image comfortably
    if (aspectInfo.isTallStrip) {
      // Long vertical strip: give generous height so strip details are visible
      return { minHeight: '380px', maxHeight: '520px', height: '460px' };
    } else if (aspectInfo.isWideStrip) {
      // Wide panoramic swath: adapt to wider proportion without huge blank letterbox
      return { minHeight: '260px', maxHeight: '380px', height: '300px' };
    } else {
      // Normal ratio
      return { height: '360px' };
    }
  }, [slot.src, localFitMode, aspectInfo]);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Title Label & Optional Format Indicator */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-slate-800">
          {title}
        </label>
        {slot.src && (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
            {aspectInfo.isTallStrip && <MoveVertical className="w-3 h-3 text-sky-600" />}
            {aspectInfo.isWideStrip && <MoveHorizontal className="w-3 h-3 text-sky-600" />}
            <span>{aspectInfo.label}</span>
          </span>
        )}
      </div>

      {/* Sensor Dropdown Selector */}
      <div className="relative mb-3">
        <button
          type="button"
          id={`sensor-dropdown-${slot.id}`}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs text-xs font-semibold text-slate-800 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2 truncate">
            <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="truncate">
              {slot.sensor} ({slot.resolutionText})
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1.5" />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-40 space-y-1">
              {LUNAR_SENSORS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onSelectSensor(s.id);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                    slot.sensor === s.id
                      ? 'bg-blue-50 text-[#2563EB] font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-[10px] text-slate-500 font-normal">{s.fullName}</p>
                  </div>
                  {slot.sensor === s.id && (
                    <Check className="w-3.5 h-3.5 text-[#2563EB]" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Adaptive Image Card Frame */}
      <div
        style={containerStyle}
        className={`relative w-full rounded-2xl transition-all duration-200 flex flex-col items-center justify-center overflow-hidden select-none border ${
          slot.src
            ? 'bg-slate-950 border-slate-800 shadow-sm'
            : isDragging
            ? 'bg-blue-50/70 border-2 border-dashed border-[#2563EB] ring-4 ring-blue-100'
            : 'bg-white hover:bg-slate-50/60 border-2 border-dashed border-slate-300 hover:border-slate-400 cursor-pointer'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!slot.src) {
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.tif,.tiff,.img"
          className="hidden"
          onChange={handleInputChange}
        />

        {/* STATE A: Image is Loaded */}
        {slot.src ? (
          <div className="relative w-full h-full group flex items-center justify-center overflow-hidden">
            {/* Image Container with Fit & Scroll behavior */}
            <div
              className={`w-full h-full flex items-center justify-center ${
                localFitMode === 'scrollable'
                  ? 'overflow-auto cursor-grab active:cursor-grabbing p-2'
                  : 'overflow-hidden'
              }`}
            >
              <img
                src={slot.src}
                alt={slot.fileName || title}
                style={{
                  transform: zoomLevel !== 1 ? `scale(${zoomLevel})` : undefined,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                }}
                className={`max-w-none transition-all ${
                  localFitMode === 'scrollable'
                    ? aspectInfo.isTallStrip
                      ? 'w-full h-auto object-contain'
                      : aspectInfo.isWideStrip
                      ? 'h-full w-auto object-contain'
                      : 'w-full h-full object-contain'
                    : localFitMode === 'adaptive'
                    ? aspectInfo.isTallStrip
                      ? 'h-full w-auto max-w-full object-contain'
                      : 'w-full h-full object-contain'
                    : 'w-full h-full object-contain'
                }`}
              />
            </div>

            {/* Top Toolbar: View Fit Controls & Zoom */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20 opacity-90 group-hover:opacity-100 transition-opacity">
              {/* Fit Mode Switcher Pills */}
              <div className="flex items-center bg-black/60 backdrop-blur-md rounded-lg p-0.5 border border-white/10 text-[10px] text-white">
                <button
                  type="button"
                  title="Adaptive Strip Mode"
                  onClick={(e) => {
                    e.stopPropagation();
                    changeFitMode('adaptive');
                  }}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    localFitMode === 'adaptive'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Adaptive
                </button>
                <button
                  type="button"
                  title="Contain Full Image"
                  onClick={(e) => {
                    e.stopPropagation();
                    changeFitMode('contain');
                  }}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    localFitMode === 'contain'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Fit
                </button>
                <button
                  type="button"
                  title="Scrollable 1:1 Strip Mode"
                  onClick={(e) => {
                    e.stopPropagation();
                    changeFitMode('scrollable');
                  }}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    localFitMode === 'scrollable'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Strip Scroll
                </button>
              </div>

              {/* Zoom Buttons */}
              <div className="hidden sm:flex items-center bg-black/60 backdrop-blur-md rounded-lg p-0.5 border border-white/10 text-white">
                <button
                  type="button"
                  title="Zoom In"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
                  }}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="Zoom Out"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
                  }}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                {zoomLevel !== 1 && (
                  <button
                    type="button"
                    title="Reset Zoom"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomLevel(1);
                    }}
                    className="p-1 hover:bg-white/20 rounded text-amber-400 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Fullscreen & Clear Buttons */}
              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-lg p-0.5 border border-white/10 text-white">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviewClick();
                  }}
                  title="Fullscreen Preview"
                  className="p-1 hover:bg-white/20 rounded transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  title="Remove Image"
                  className="p-1 hover:bg-red-600 rounded text-red-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Bottom Floating Info Pill (matching screenshot badge) */}
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2 pointer-events-none z-20">
              <span className="px-2.5 py-1 bg-black/80 backdrop-blur-md rounded-md text-[11px] font-medium text-slate-200 border border-white/10 shadow-sm">
                {slot.sensor} • {slot.resolutionText}
              </span>
              {slot.width > 0 && (
                <span className="hidden sm:inline-block px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-[10px] font-mono text-slate-300 border border-white/10">
                  {slot.width} × {slot.height} px
                </span>
              )}
            </div>

            {/* Change File Trigger (hover button) */}
            <div className="absolute bottom-2.5 right-2.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-2.5 py-1 bg-white/90 hover:bg-white text-slate-900 rounded-lg text-xs font-semibold shadow-md transition-colors cursor-pointer"
              >
                Change Image
              </button>
            </div>
          </div>
        ) : (
          /* STATE B: Empty Upload Dropzone */
          <div className="flex flex-col items-center justify-center p-6 text-center">
            {/* Outline Cloud with Arrow Icon */}
            <div className="w-12 h-12 flex items-center justify-center mb-2 text-[#1E3A8A]">
              <UploadCloud className="w-10 h-10 stroke-[1.75]" />
            </div>

            <p className="text-sm font-semibold text-slate-800">
              Upload Image
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              GeoTIFF, IMG, PNG, JPG (Long strips & wide swaths supported)
            </p>

            {/* Quick Sample Action */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample();
              }}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[11px] font-semibold text-[#2563EB] transition-colors"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Load {slot.sensor} Sample</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
