import { useState, useCallback, useEffect } from 'react';
import { ArrowLeftRight, Sparkles, MoveVertical, MoveHorizontal, RotateCcw } from 'lucide-react';
import HyperdriveHero from './components/ui/hyperdrive-hero';
import { ChandraRegistrationStage } from './components/ChandraRegistrationStage';
import { SensorsShowcase } from './components/SensorsShowcase';
import { AboutView } from './components/AboutView';
import { ImageLightbox } from './components/ImageLightbox';
import {
  ImageSlotState,
  RegistrationOptionsState,
  AppTab,
  SensorType,
  RegistrationMetrics,
} from './types';
import { Navbar } from './components/Navbar';
import {
  LUNAR_SENSORS,
  DEFAULT_SOURCE_IMAGE,
  DEFAULT_REFERENCE_IMAGE,
  SAMPLE_STRIPS,
} from './data/lunarSensors';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [hasEnteredWorkspace, setHasEnteredWorkspace] = useState(false);
  const [metrics, setMetrics] = useState<RegistrationMetrics>({
    matches: '—',
    inliers: '—',
    inlierRatio: '—',
    rmse: '—',
  });

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';
    fetch(`${apiBase}/output.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`Metrics request failed: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        const result = data?.metrics ?? data?.result ?? data;
        setMetrics({
          matches: result?.matches ?? result?.matchedKeypoints ?? '—',
          inliers: result?.inliers ?? result?.inlierKeypoints ?? '—',
          inlierRatio: result?.inlierRatio ?? result?.inlier_ratio ?? '—',
          rmse: result?.rmse ?? result?.registrationRmse ?? '—',
        });
      })
      .catch(() => {
        // The dashboard stays usable while the FastAPI service is unavailable.
      });
  }, []);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(true);
  const [lightboxPreview, setLightboxPreview] = useState<{
    src: string;
    label: string;
  } | null>(null);

  // Source Image Slot (initialized with default OHRC sample)
  const [sourceSlot, setSourceSlot] = useState<ImageSlotState>({
    id: 'source',
    label: 'Source Image',
    sensor: DEFAULT_SOURCE_IMAGE.sensor,
    resolutionText: DEFAULT_SOURCE_IMAGE.resolutionText,
    src: DEFAULT_SOURCE_IMAGE.url,
    file: null,
    fileName: DEFAULT_SOURCE_IMAGE.name,
    fileSize: 2450000,
    width: DEFAULT_SOURCE_IMAGE.width,
    height: DEFAULT_SOURCE_IMAGE.height,
    isLoading: false,
    error: null,
  });

  // Reference Image Slot (initialized with default TMC-2 sample)
  const [referenceSlot, setReferenceSlot] = useState<ImageSlotState>({
    id: 'reference',
    label: 'Reference Image',
    sensor: DEFAULT_REFERENCE_IMAGE.sensor,
    resolutionText: DEFAULT_REFERENCE_IMAGE.resolutionText,
    src: DEFAULT_REFERENCE_IMAGE.url,
    file: null,
    fileName: DEFAULT_REFERENCE_IMAGE.name,
    fileSize: 2200000,
    width: DEFAULT_REFERENCE_IMAGE.width,
    height: DEFAULT_REFERENCE_IMAGE.height,
    isLoading: false,
    error: null,
  });

  // Options State
  const [options, setOptions] = useState<RegistrationOptionsState>({
    spatialFiltering: true,
    contrastEnhancement: false,
    detectorType: 'SIFT',
    transformationType: 'Homography',
  });

  // Load User File Handler with Natural Dimensions Detection
  const handleFileSelect = useCallback(
    (slotId: 'source' | 'reference', file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const img = new Image();
          img.onload = () => {
            const updater = slotId === 'source' ? setSourceSlot : setReferenceSlot;
            updater((prev) => ({
              ...prev,
              src: e.target?.result as string,
              file,
              fileName: file.name,
              fileSize: file.size,
              width: img.naturalWidth,
              height: img.naturalHeight,
            }));
            setHasRun(true);
          };
          img.src = e.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    },
    []
  );

  // Switch Sensor Dropdown
  const handleSensorChange = useCallback(
    (slotId: 'source' | 'reference', sensorId: SensorType) => {
      const spec = LUNAR_SENSORS.find((s) => s.id === sensorId);
      const resText = spec ? spec.resolution : 'Custom';
      const updater = slotId === 'source' ? setSourceSlot : setReferenceSlot;
      updater((prev) => ({
        ...prev,
        sensor: sensorId,
        resolutionText: resText,
      }));
    },
    []
  );

  // Clear Slot
  const handleClearSlot = useCallback((slotId: 'source' | 'reference') => {
    const updater = slotId === 'source' ? setSourceSlot : setReferenceSlot;
    updater((prev) => ({
      ...prev,
      src: null,
      file: null,
      fileName: null,
      fileSize: 0,
      width: 0,
      height: 0,
      error: null,
    }));
  }, []);

  // Swap Images
  const handleSwapSlots = useCallback(() => {
    setSourceSlot((src) => {
      setReferenceSlot(src);
      return referenceSlot;
    });
  }, [referenceSlot]);

  // Load Single Sample
  const handleLoadSample = useCallback(
    (slotId: 'source' | 'reference') => {
      const sample =
        slotId === 'source' ? DEFAULT_SOURCE_IMAGE : DEFAULT_REFERENCE_IMAGE;
      const updater = slotId === 'source' ? setSourceSlot : setReferenceSlot;
      updater((prev) => ({
        ...prev,
        sensor: sample.sensor,
        resolutionText: sample.resolutionText,
        src: sample.url,
        fileName: sample.name,
        width: sample.width,
        height: sample.height,
        fileSize: 2450000,
      }));
      setHasRun(true);
    },
    []
  );

  // Load Long Vertical Strip Sample (OHRC 1:3.25)
  const handleLoadLongStripSample = useCallback(() => {
    const strip = SAMPLE_STRIPS.longVerticalStrip;
    setSourceSlot((prev) => ({
      ...prev,
      sensor: strip.sensor,
      resolutionText: strip.resolutionText,
      src: strip.url,
      fileName: strip.name,
      width: strip.width,
      height: strip.height,
    }));
    setHasRun(true);
  }, []);

  // Load Wide Panoramic Swath Sample (TMC-2 3.2:1)
  const handleLoadWideSwathSample = useCallback(() => {
    const swath = SAMPLE_STRIPS.wideSwath;
    setReferenceSlot((prev) => ({
      ...prev,
      sensor: swath.sensor,
      resolutionText: swath.resolutionText,
      src: swath.url,
      fileName: swath.name,
      width: swath.width,
      height: swath.height,
    }));
    setHasRun(true);
  }, []);

  // Reset to Standard Default Pair
  const handleLoadStandardPair = useCallback(() => {
    setSourceSlot({
      id: 'source',
      label: 'Source Image',
      sensor: DEFAULT_SOURCE_IMAGE.sensor,
      resolutionText: DEFAULT_SOURCE_IMAGE.resolutionText,
      src: DEFAULT_SOURCE_IMAGE.url,
      file: null,
      fileName: DEFAULT_SOURCE_IMAGE.name,
      fileSize: 2450000,
      width: DEFAULT_SOURCE_IMAGE.width,
      height: DEFAULT_SOURCE_IMAGE.height,
      isLoading: false,
      error: null,
    });
    setReferenceSlot({
      id: 'reference',
      label: 'Reference Image',
      sensor: DEFAULT_REFERENCE_IMAGE.sensor,
      resolutionText: DEFAULT_REFERENCE_IMAGE.resolutionText,
      src: DEFAULT_REFERENCE_IMAGE.url,
      file: null,
      fileName: DEFAULT_REFERENCE_IMAGE.name,
      fileSize: 2200000,
      width: DEFAULT_REFERENCE_IMAGE.width,
      height: DEFAULT_REFERENCE_IMAGE.height,
      isLoading: false,
      error: null,
    });
    setHasRun(true);
  }, []);

  // Load from bottom showcase
  const handleLoadFromShowcase = useCallback(
    (slotId: 'source' | 'reference', sensor: SensorType, url: string, name: string) => {
      const spec = LUNAR_SENSORS.find((s) => s.id === sensor);
      const updater = slotId === 'source' ? setSourceSlot : setReferenceSlot;
      updater((prev) => ({
        ...prev,
        sensor,
        resolutionText: spec?.resolution || '',
        src: url,
        fileName: name,
        width: 1024,
        height: 1024,
        fileSize: 2200000,
      }));
      setHasRun(true);
    },
    []
  );

  // Run Registration Action (Simulates sub-pixel correspondence matching)
  const handleRunRegistration = useCallback(() => {
    if (!sourceSlot.src) {
      handleLoadSample('source');
    }
    if (!referenceSlot.src) {
      handleLoadSample('reference');
    }

    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setHasRun(true);
    }, 900);
  }, [sourceSlot.src, referenceSlot.src, handleLoadSample]);

  // Tab navigation mapping
  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab);
    if (tab === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!hasEnteredWorkspace) {
    return <HyperdriveHero onEngage={() => setHasEnteredWorkspace(true)} />;
  }

  return (
    <div className="dashboard-shell min-h-screen w-full bg-[#080808] text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] flex flex-col">
      <Navbar />
      {/* 3. Dynamic Workspace Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-14 space-y-6 flex-1">
        {activeTab === 'about' ? (
          <AboutView />
        ) : (
          <>
            {/* Quick Strip Presets & Geometry Test Bar */}
            <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  Adaptive Ratio Presets:
                </span>
                <span className="text-[11px] text-slate-400 hidden md:inline">
                  Test how containers adapt to long orbital strips and wide swaths
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadLongStripSample}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  <MoveVertical className="w-3 h-3 text-sky-600" />
                  <span>Load Long Strip (1:3.25)</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadWideSwathSample}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  <MoveHorizontal className="w-3 h-3 text-sky-600" />
                  <span>Load Wide Swath (3.2:1)</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadStandardPair}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Reset to default standard pair"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Standard</span>
                </button>
              </div>
            </div>

            {/* PRIMARY REGISTRATION CANVAS: 3 IMAGES WIREFRAME LAYOUT (from user diagram)
                - Top: OHRC (left)  <---- correspond. ---->  TMC-2 (right)
                - Below: REGISTERED OUTPUT  -->  [ OVERLAY / BLINK ]
                - Bottom: 1,248 Matches | 732 Inliers | 58.7% Inlier Ratio | 2.4 px RMSE
            */}
            <ChandraRegistrationStage
              source={sourceSlot}
              reference={referenceSlot}
              options={options}
              onChangeOptions={(upd) => setOptions((prev) => ({ ...prev, ...upd }))}
              onFileSelect={handleFileSelect}
              onSelectSensor={handleSensorChange}
              onClear={handleClearSlot}
              onLoadSample={handleLoadSample}
              onSwap={handleSwapSlots}
              onOpenLightbox={(src, label) => setLightboxPreview({ src, label })}
              isRunning={isRunning}
              onRunRegistration={handleRunRegistration}
              metrics={metrics}
            />

            {/* Bottom Card: Three Sensors. One Lunar Surface. */}
            <SensorsShowcase
              onLoadAsSource={(sensor, url, name) =>
                handleLoadFromShowcase('source', sensor, url, name)
              }
              onLoadAsReference={(sensor, url, name) =>
                handleLoadFromShowcase('reference', sensor, url, name)
              }
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200">ChandraMatch</span>
            <span>•</span>
            <span>Multi-modal Lunar Image Registration</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Team Avishkar (SIH 2026)</span>
            <span>•</span>
            <span>Grey-scale analysis mode</span>
          </div>
        </div>
      </footer>

      {/* Lightbox inspection modal */}
      {lightboxPreview && (
        <ImageLightbox
          src={lightboxPreview.src}
          label={lightboxPreview.label}
          onClose={() => setLightboxPreview(null)}
        />
      )}
    </div>
  );
}
