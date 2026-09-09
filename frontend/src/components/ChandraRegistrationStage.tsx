import React, { useState, useEffect, useRef, useMemo } from 'react';
import { gsap } from 'gsap';
import {
  ArrowRight,
  ArrowLeftRight,
  Play,
  Pause,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload,
  X,
  ChevronDown,
  Check,
  SplitSquareVertical,
  Layers,
  LayoutGrid,
  Columns,
  EyeOff,
  MoveHorizontal,
  MoveVertical,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ImageSlotState, SensorType, RegistrationOptionsState, RegistrationMetrics } from '../types';
import { LUNAR_SENSORS, SAMPLE_STRIPS, DEFAULT_SOURCE_IMAGE, DEFAULT_REFERENCE_IMAGE } from '../data/lunarSensors';

interface ChandraRegistrationStageProps {
  source: ImageSlotState;
  reference: ImageSlotState;
  options: RegistrationOptionsState;
  onChangeOptions: (options: Partial<RegistrationOptionsState>) => void;
  onFileSelect: (slotId: 'source' | 'reference', file: File) => void;
  onSelectSensor: (slotId: 'source' | 'reference', sensor: SensorType) => void;
  onClear: (slotId: 'source' | 'reference') => void;
  onLoadSample: (slotId: 'source' | 'reference') => void;
  onSwap: () => void;
  onOpenLightbox: (src: string, label: string) => void;
  isRunning: boolean;
  onRunRegistration: () => void;
  metrics: RegistrationMetrics;
}

export const ChandraRegistrationStage: React.FC<ChandraRegistrationStageProps> = ({
  source,
  reference,
  options,
  onChangeOptions,
  onFileSelect,
  onSelectSensor,
  onClear,
  onLoadSample,
  onSwap,
  onOpenLightbox,
  isRunning,
  onRunRegistration,
  metrics,
}) => {
  // Mode for the result div: 'blink' | 'overlay' | 'swipe'
  const [activeOutputMode, setActiveOutputMode] = useState<'blink' | 'overlay' | 'swipe'>('blink');

  // View mode: 'three-col' (all 3 side-by-side) or 'expanded-result' (result expanded, others hidden)
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Blink comparator states
  const [isBlinking, setIsBlinking] = useState<boolean>(true);
  const [blinkLayer, setBlinkLayer] = useState<'source' | 'reference'>('source');
  const [blinkSpeedMs, setBlinkSpeedMs] = useState<number>(600);

  // Overlay transparency slider
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.5);

  // Swipe split position
  const [swipePos, setSwipePos] = useState<number>(50);
  const swipeContainerRef = useRef<HTMLDivElement>(null);

  // Zoom states for the 3 image cards
  const [zoomSource, setZoomSource] = useState<number>(1);
  const [zoomRef, setZoomRef] = useState<number>(1);
  const [zoomOutput, setZoomOutput] = useState<number>(1);

  // Sensor dropdowns
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  const [isRefDropdownOpen, setIsRefDropdownOpen] = useState(false);

  // Hidden file inputs
  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  // Drag states
  const [isDraggingSource, setIsDraggingSource] = useState(false);
  const [isDraggingRef, setIsDraggingRef] = useState(false);

  // GSAP animation references
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceColRef = useRef<HTMLDivElement>(null);
  const refColRef = useRef<HTMLDivElement>(null);
  const resultColRef = useRef<HTMLDivElement>(null);
  const scanBeamRef = useRef<HTMLDivElement>(null);

  // Automatic Blink Loop
  useEffect(() => {
    if (activeOutputMode !== 'blink' || !isBlinking || !source.src || !reference.src) {
      return;
    }
    const interval = setInterval(() => {
      setBlinkLayer((prev) => (prev === 'source' ? 'reference' : 'source'));
    }, blinkSpeedMs);

    return () => clearInterval(interval);
  }, [activeOutputMode, isBlinking, blinkSpeedMs, source.src, reference.src]);

  // GSAP: Expand Result and Hide Source & Reference
  const animateExpandResult = () => {
    if (!sourceColRef.current || !refColRef.current || !resultColRef.current) return;

    setIsExpanded(true);

    const tl = gsap.timeline({ defaults: { duration: 0.65, ease: 'power3.inOut' } });

    // Animate scanning beam on result card
    if (scanBeamRef.current) {
      gsap.fromTo(
        scanBeamRef.current,
        { x: '-100%', opacity: 0.8 },
        { x: '100%', opacity: 0, duration: 1.2, ease: 'power2.inOut' }
      );
    }

    // 1. Fade out & collapse Source and Reference cards
    tl.to([sourceColRef.current, refColRef.current], {
      opacity: 0,
      scale: 0.9,
      width: 0,
      minWidth: 0,
      paddingLeft: 0,
      paddingRight: 0,
      marginLeft: 0,
      marginRight: 0,
      stagger: 0.08,
      onComplete: () => {
        if (sourceColRef.current) sourceColRef.current.style.display = 'none';
        if (refColRef.current) refColRef.current.style.display = 'none';
      },
    })
      // 2. Expand Result card to 100% width simultaneously
      .to(
        resultColRef.current,
        {
          width: '100%',
          flex: '1 1 100%',
          duration: 0.65,
          ease: 'power3.inOut',
        },
        '<'
      );
  };

  // GSAP: Reappear Source and Reference & Restore 3-Side-by-Side View
  const animateRestoreThreeCol = () => {
    if (!sourceColRef.current || !refColRef.current || !resultColRef.current) return;

    setIsExpanded(false);

    const tl = gsap.timeline({ defaults: { duration: 0.65, ease: 'power3.inOut' } });

    // Make elements visible again in layout
    sourceColRef.current.style.display = 'flex';
    refColRef.current.style.display = 'flex';

    // 1. Shrink result div back to ~33% width
    tl.to(resultColRef.current, {
      width: '33.333%',
      flex: '1 1 0%',
      duration: 0.65,
      ease: 'power3.inOut',
    })
      // 2. Animate Source and Reference back in smoothly
      .to(
        [sourceColRef.current, refColRef.current],
        {
          opacity: 1,
          scale: 1,
          width: '33.333%',
          flex: '1 1 0%',
          clearProps: 'minWidth,paddingLeft,paddingRight,marginLeft,marginRight',
          duration: 0.65,
          stagger: 0.08,
          ease: 'power3.inOut',
        },
        '<'
      );
  };

  // Run Pipeline trigger: runs registration and animates expansion
  const handleRunPipeline = () => {
    onRunRegistration();
    animateExpandResult();
  };

  // Dynamic adaptive height based on image aspect ratio (supports long strips & wide swaths)
  const getContainerAdaptiveStyle = (slot: ImageSlotState, isResult = false) => {
    const w = slot.width || 1024;
    const h = slot.height || 768;
    const ratio = w / h;

    if (ratio < 0.65) {
      // Long vertical orbital strip (e.g. 1:3.25)
      return { height: isExpanded ? '540px' : '440px', minHeight: '380px' };
    } else if (ratio > 1.8) {
      // Wide panoramic swath (e.g. 3.2:1)
      return { height: isExpanded ? '380px' : '300px', minHeight: '260px' };
    }
    return { height: isExpanded ? '480px' : '360px', minHeight: '320px' };
  };

  const outputAdaptiveStyle = useMemo(() => {
    const sRatio = source.width && source.height ? source.width / source.height : 1.33;
    const rRatio = reference.width && reference.height ? reference.width / reference.height : 1.33;
    const isLongStrip = sRatio < 0.65 || rRatio < 0.65;
    const isWideSwath = sRatio > 1.8 || rRatio > 1.8;

    if (isLongStrip) {
      return { height: isExpanded ? '560px' : '460px', minHeight: '400px' };
    }
    if (isWideSwath) {
      return { height: isExpanded ? '400px' : '320px', minHeight: '280px' };
    }
    return { height: isExpanded ? '480px' : '360px', minHeight: '320px' };
  }, [source.width, source.height, reference.width, reference.height, isExpanded]);

  // Swipe drag handler
  const handleSwipePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const handleMove = (ev: MouseEvent | TouchEvent) => {
      if (!swipeContainerRef.current) return;
      const rect = swipeContainerRef.current.getBoundingClientRect();
      const clientX = 'touches' in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      const offset = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (offset / rect.width) * 100));
      setSwipePos(pct);
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
    <div className="w-full flex flex-col">
      {/* =========================================================================
          MAIN STAGE: 3 IMAGE DIVS SIDE-BY-SIDE (Source | Reference | Result)
          Animates with GSAP: Result expands to 100%, Source & Reference hide/reappear
          ========================================================================= */}
      <div
        ref={containerRef}
        className="w-full flex flex-col bg-[#111622] rounded-2xl border border-slate-800/90 p-4 sm:p-6 shadow-2xl font-mono relative overflow-hidden"
      >
        {/* THE 3 IMAGES SIDE BY SIDE ROW (Animated by GSAP) - ALWAYS IN A ROW */}
        <div className="w-full flex flex-row items-stretch gap-3 sm:gap-4 transition-all duration-300 min-h-0">
          {/* =====================================================================
              DIV 1: OHRC (Source Image) - In Row
              ===================================================================== */}
          <div
            ref={sourceColRef}
            className="flex-1 w-1/3 min-w-0 flex flex-col transition-all origin-left"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wider">
                  {source.sensor}
                </span>
                <span className="text-xs text-slate-400 font-sans">
                  ({source.resolutionText})
                </span>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
                  className="flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  <span>Sensor</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {isSourceDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsSourceDropdownOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-1 z-40 space-y-1 font-sans">
                      {LUNAR_SENSORS.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            onSelectSensor('source', s.id);
                            setIsSourceDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs ${
                            source.sensor === s.id
                              ? 'bg-blue-600 text-white font-semibold'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>{s.name}</span>
                          {source.sensor === s.id && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Container 1: Adapts to long strips & wide swaths */}
            <div
              style={getContainerAdaptiveStyle(source)}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingSource(true);
              }}
              onDragLeave={() => setIsDraggingSource(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingSource(false);
                if (e.dataTransfer.files?.[0]) onFileSelect('source', e.dataTransfer.files[0]);
              }}
              className={`relative w-full rounded-xl transition-all duration-200 flex flex-col items-center justify-center overflow-hidden border-2 ${
                source.src
                  ? 'border-dashed border-slate-700 bg-slate-950'
                  : isDraggingSource
                  ? 'border-dashed border-blue-500 bg-blue-950/40 ring-2 ring-blue-500/40'
                  : 'border-dashed border-slate-700 hover:border-slate-500 bg-slate-950/60 cursor-pointer'
              }`}
              onClick={() => {
                if (!source.src) sourceFileInputRef.current?.click();
              }}
            >
              <input
                ref={sourceFileInputRef}
                type="file"
                accept="image/*,.tif,.tiff,.img"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) onFileSelect('source', e.target.files[0]);
                  e.target.value = '';
                }}
              />

              {source.src ? (
                <div className="relative w-full h-full group flex items-center justify-center overflow-hidden">
                  <img
                    src={source.src}
                    alt="Source OHRC"
                    style={{
                      transform: zoomSource !== 1 ? `scale(${zoomSource})` : undefined,
                      transition: 'transform 0.15s ease-out',
                    }}
                    className="max-h-full max-w-full object-contain"
                  />
                  {/* Overlay Controls */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-sm p-1 rounded-lg border border-white/10">
                    <button
                      type="button"
                      title="Zoom In"
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomSource((z) => Math.min(z + 0.25, 3));
                      }}
                      className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Zoom Out"
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomSource((z) => Math.max(z - 0.25, 0.5));
                      }}
                      className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Clear"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClear('source');
                      }}
                      className="p-1 hover:bg-red-600 rounded text-red-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Bottom Label */}
                  <div className="absolute bottom-2 inset-x-0 flex items-center justify-between px-3 pointer-events-none">
                    <span className="text-[10px] font-mono tracking-widest text-slate-400 bg-black/60 px-2 py-0.5 rounded border border-white/10">
                      IMAGE
                    </span>
                    {source.width > 0 && (
                      <span className="text-[10px] font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded border border-white/10">
                        {source.width} × {source.height}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <Upload className="w-6 h-6 mb-2 text-slate-500" />
                  <span className="text-xs font-bold text-slate-300 tracking-wider">
                    IMAGE
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 font-sans">
                    Drop {source.sensor} strip here
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadSample('source');
                    }}
                    className="mt-2.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-blue-400 font-sans border border-slate-700"
                  >
                    Load Sample
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* =====================================================================
              DIV 2: TMC-2 (Reference Image) - In Row
              ===================================================================== */}
          <div
            ref={refColRef}
            className="flex-1 w-1/3 min-w-0 flex flex-col transition-all origin-left"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wider">
                  {reference.sensor}
                </span>
                <span className="text-xs text-slate-400 font-sans">
                  ({reference.resolutionText})
                </span>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsRefDropdownOpen(!isRefDropdownOpen)}
                  className="flex items-center gap-1 text-[11px] font-sans px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  <span>Sensor</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {isRefDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsRefDropdownOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-1 z-40 space-y-1 font-sans">
                      {LUNAR_SENSORS.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            onSelectSensor('reference', s.id);
                            setIsRefDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs ${
                            reference.sensor === s.id
                              ? 'bg-blue-600 text-white font-semibold'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>{s.name}</span>
                          {reference.sensor === s.id && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Container 2: Adapts to long strips & wide swaths */}
            <div
              style={getContainerAdaptiveStyle(reference)}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingRef(true);
              }}
              onDragLeave={() => setIsDraggingRef(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingRef(false);
                if (e.dataTransfer.files?.[0]) onFileSelect('reference', e.dataTransfer.files[0]);
              }}
              className={`relative w-full rounded-xl transition-all duration-200 flex flex-col items-center justify-center overflow-hidden border-2 ${
                reference.src
                  ? 'border-dashed border-slate-700 bg-slate-950'
                  : isDraggingRef
                  ? 'border-dashed border-blue-500 bg-blue-950/40 ring-2 ring-blue-500/40'
                  : 'border-dashed border-slate-700 hover:border-slate-500 bg-slate-950/60 cursor-pointer'
              }`}
              onClick={() => {
                if (!reference.src) refFileInputRef.current?.click();
              }}
            >
              <input
                ref={refFileInputRef}
                type="file"
                accept="image/*,.tif,.tiff,.img"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) onFileSelect('reference', e.target.files[0]);
                  e.target.value = '';
                }}
              />

              {reference.src ? (
                <div className="relative w-full h-full group flex items-center justify-center overflow-hidden">
                  <img
                    src={reference.src}
                    alt="Reference TMC-2"
                    style={{
                      transform: zoomRef !== 1 ? `scale(${zoomRef})` : undefined,
                      transition: 'transform 0.15s ease-out',
                    }}
                    className="max-h-full max-w-full object-contain"
                  />
                  {/* Overlay Controls */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-sm p-1 rounded-lg border border-white/10">
                    <button
                      type="button"
                      title="Zoom In"
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomRef((z) => Math.min(z + 0.25, 3));
                      }}
                      className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Zoom Out"
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomRef((z) => Math.max(z - 0.25, 0.5));
                      }}
                      className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Clear"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClear('reference');
                      }}
                      className="p-1 hover:bg-red-600 rounded text-red-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Bottom Label */}
                  <div className="absolute bottom-2 inset-x-0 flex items-center justify-between px-3 pointer-events-none">
                    <span className="text-[10px] font-mono tracking-widest text-slate-400 bg-black/60 px-2 py-0.5 rounded border border-white/10">
                      IMAGE
                    </span>
                    {reference.width > 0 && (
                      <span className="text-[10px] font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded border border-white/10">
                        {reference.width} × {reference.height}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <Upload className="w-6 h-6 mb-2 text-slate-500" />
                  <span className="text-xs font-bold text-slate-300 tracking-wider">
                    IMAGE
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 font-sans">
                    Drop {reference.sensor} swath here
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadSample('reference');
                    }}
                    className="mt-2.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-blue-400 font-sans border border-slate-700"
                  >
                    Load Sample
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* =====================================================================
              DIV 3: REGISTERED OUTPUT (OVERLAY / BLINK) - In Row, Expands with GSAP
              ===================================================================== */}
          <div
            ref={resultColRef}
            className={`flex flex-col min-w-0 transition-all origin-left ${
              isExpanded ? 'w-full flex-1' : 'flex-1 w-1/3'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white tracking-widest uppercase truncate">
                REGISTERED OUTPUT
              </span>

              {/* Mode selector: BLINK / OVERLAY / SWIPE */}
              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-700 text-[10px] shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveOutputMode('blink')}
                  className={`px-2 py-0.5 rounded font-mono ${
                    activeOutputMode === 'blink'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  BLINK
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOutputMode('overlay')}
                  className={`px-2 py-0.5 rounded font-mono ${
                    activeOutputMode === 'overlay'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  OVERLAY
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOutputMode('swipe')}
                  className={`px-2 py-0.5 rounded font-mono ${
                    activeOutputMode === 'swipe'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SWIPE
                </button>
              </div>
            </div>

            {/* Container 3: OVERLAY / BLINK - Expands smoothly via GSAP */}
            <div
              style={outputAdaptiveStyle}
              className="relative w-full rounded-xl border-2 border-dashed border-sky-500/60 bg-slate-950 overflow-hidden flex items-center justify-center transition-all shadow-inner"
            >
              {/* Laser Scanning Animation Beam */}
              <div
                ref={scanBeamRef}
                className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-sky-400/40 to-transparent pointer-events-none z-30 opacity-0"
              />

              {source.src || reference.src ? (
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  {/* MODE 1: BLINK */}
                  {activeOutputMode === 'blink' && (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img
                        src={
                          blinkLayer === 'source'
                            ? source.src || reference.src!
                            : reference.src || source.src!
                        }
                        alt="Blink Result Layer"
                        style={{
                          transform: zoomOutput !== 1 ? `scale(${zoomOutput})` : undefined,
                          transition: 'transform 0.15s ease-out',
                        }}
                        className="max-h-full max-w-full object-contain"
                      />
                      {/* Live Blinking indicator */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none z-20">
                        <span className="px-2 py-0.5 bg-black/80 backdrop-blur-md rounded border border-white/10 text-[10px] font-mono font-bold text-sky-300">
                          {blinkLayer === 'source' ? source.sensor : reference.sensor}
                        </span>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      </div>
                    </div>
                  )}

                  {/* MODE 2: OVERLAY BLEND */}
                  {activeOutputMode === 'overlay' && (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {reference.src && (
                        <img
                          src={reference.src}
                          alt="Reference Base"
                          style={{
                            transform: zoomOutput !== 1 ? `scale(${zoomOutput})` : undefined,
                          }}
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                      )}
                      {source.src && (
                        <img
                          src={source.src}
                          alt="Source Warp Overlay"
                          style={{
                            opacity: overlayOpacity,
                            transform: zoomOutput !== 1 ? `scale(${zoomOutput})` : undefined,
                          }}
                          className="absolute inset-0 w-full h-full object-contain mix-blend-screen"
                        />
                      )}
                    </div>
                  )}

                  {/* MODE 3: SWIPE */}
                  {activeOutputMode === 'swipe' && (
                    <div
                      ref={swipeContainerRef}
                      onMouseDown={handleSwipePointerDown}
                      onTouchStart={handleSwipePointerDown}
                      className="relative w-full h-full cursor-ew-resize overflow-hidden"
                    >
                      {reference.src && (
                        <img
                          src={reference.src}
                          alt="Reference Base"
                          style={{
                            transform: zoomOutput !== 1 ? `scale(${zoomOutput})` : undefined,
                          }}
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        />
                      )}
                      {source.src && (
                        <div
                          className="absolute inset-0 overflow-hidden pointer-events-none"
                          style={{ width: `${swipePos}%` }}
                        >
                          <img
                            src={source.src}
                            alt="Source Layer"
                            style={{
                              transform: zoomOutput !== 1 ? `scale(${zoomOutput})` : undefined,
                              width: swipeContainerRef.current?.clientWidth || '100%',
                              maxWidth: 'none',
                            }}
                            className="h-full object-contain"
                          />
                        </div>
                      )}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none z-30"
                        style={{ left: `${swipePos}%` }}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-slate-900 border-2 border-sky-400 flex items-center justify-center text-sky-400">
                          <SplitSquareVertical className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Top Zoom Controls */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm p-1 rounded-lg border border-white/10 z-20">
                    <button
                      type="button"
                      title="Zoom In"
                      onClick={() => setZoomOutput((z) => Math.min(z + 0.25, 3))}
                      className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Zoom Out"
                      onClick={() => setZoomOutput((z) => Math.max(z - 0.25, 0.5))}
                      className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Fullscreen"
                      onClick={() =>
                        onOpenLightbox(
                          source.src || reference.src!,
                          'Registered Output (Overlay / Blink)'
                        )
                      }
                      className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom Center Label: OVERLAY / BLINK */}
                  <div className="absolute bottom-2 inset-x-0 flex items-center justify-center pointer-events-none z-20">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-slate-300 bg-black/75 px-2.5 py-0.5 rounded border border-white/15">
                      OVERLAY / BLINK
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <span className="text-xs font-bold text-slate-300 tracking-wider">
                    OVERLAY / BLINK
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 font-sans">
                    Run pipeline to register
                  </span>
                </div>
              )}
            </div>

            {/* Slider bar under container if in overlay mode */}
            {activeOutputMode === 'overlay' && (
              <div className="mt-2 flex items-center gap-2 px-2 py-1 bg-slate-900/90 rounded border border-slate-800 text-[11px] font-sans">
                <span className="text-slate-400 text-[10px]">Mix:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                  className="flex-1 accent-sky-500 cursor-pointer h-1.5 bg-slate-700 rounded"
                />
                <span className="text-sky-400 font-mono text-[10px] w-8 text-right">
                  {(overlayOpacity * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            BOTTOM METRICS BAR: 1,248 Matches | 732 Inliers | 58.7% Ratio | 2.4 px RMSE
            ========================================================================= */}
        <div className="w-full pt-6 mt-6 border-t border-slate-800/80">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-center">
            {/* Metric 1 */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col items-center">
              <span className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
                {metrics.matches}
              </span>
              <span className="text-[11px] font-mono text-slate-400 mt-0.5 tracking-wider">
                Matches
              </span>
            </div>

            {/* Metric 2 */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col items-center">
              <span className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
                {metrics.inliers}
              </span>
              <span className="text-[11px] font-mono text-slate-400 mt-0.5 tracking-wider">
                Inliers
              </span>
            </div>

            {/* Metric 3 */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col items-center">
              <span className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
                {metrics.inlierRatio}
              </span>
              <span className="text-[11px] font-mono text-slate-400 mt-0.5 tracking-wider">
                Inlier Ratio
              </span>
            </div>

            {/* Metric 4 */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col items-center">
              <span className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
                {metrics.rmse}
              </span>
              <span className="text-[11px] font-mono text-slate-400 mt-0.5 tracking-wider">
                RMSE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
