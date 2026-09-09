import React, { useEffect, useState } from 'react';
import { ImageSlotState } from '../types';
import { CheckCircle2, Cpu, Sparkles } from 'lucide-react';

interface RegistrationProcessingProps {
  source: ImageSlotState;
  reference: ImageSlotState;
  onComplete: () => void;
}

export const RegistrationProcessing: React.FC<RegistrationProcessingProps> = ({
  source,
  reference,
  onComplete,
}) => {
  const [stage, setStage] = useState(0);
  const stages = [
    { title: 'Normalizing Scale & Spatial Filtering', detail: 'Equalizing GSD differences (0.32m vs 5m) via Gaussian multi-scale pyramid' },
    { title: 'Detecting Multi-Modal Invariant Features', detail: 'Extracting scale-invariant keypoints across lunar rim and crater topography' },
    { title: 'Feature Descriptor Matching & Tie-Points', detail: 'Computing mutual nearest neighbors with ratio test thresholding' },
    { title: 'RANSAC Outlier Rejection & Homography', detail: 'Fitting robust transformation matrix and calculating registration RMSE' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => {
        if (prev < stages.length - 1) {
          return prev + 1;
        } else {
          clearInterval(timer);
          setTimeout(onComplete, 800);
          return prev;
        }
      });
    }, 900);

    return () => clearInterval(timer);
  }, [onComplete, stages.length]);

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
      <div className="max-w-2xl mx-auto py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-[#2563EB] flex items-center justify-center mx-auto mb-3 animate-pulse">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            Aligning Lunar Imagery
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Computing sub-pixel geometric correspondence between {source.sensor} and {reference.sensor}
          </p>
        </div>

        {/* Dynamic Tie-Points Visual Canvas */}
        <div className="relative w-full aspect-[21/9] bg-slate-950 rounded-xl overflow-hidden mb-8 border border-slate-800 flex items-center justify-center">
          <div className="absolute inset-0 flex">
            <div className="w-1/2 h-full opacity-40 overflow-hidden relative">
              <img src={source.src || ''} alt="Source" className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 text-[9px] font-mono text-slate-400 bg-black/60 px-1.5 py-0.5 rounded">
                Source: {source.sensor}
              </div>
            </div>
            <div className="w-1/2 h-full opacity-40 overflow-hidden relative border-l border-slate-800">
              <img src={reference.src || ''} alt="Reference" className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 text-[9px] font-mono text-slate-400 bg-black/60 px-1.5 py-0.5 rounded">
                Ref: {reference.sensor}
              </div>
            </div>
          </div>

          {/* Animated tie-points & lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Grid points */}
            {[
              { x1: '25%', y1: '35%', x2: '75%', y2: '38%' },
              { x1: '32%', y1: '55%', x2: '80%', y2: '58%' },
              { x1: '18%', y1: '70%', x2: '68%', y2: '72%' },
              { x1: '38%', y1: '25%', x2: '88%', y2: '28%' },
              { x1: '22%', y1: '48%', x2: '72%', y2: '50%' },
            ].map((line, idx) => (
              <g key={idx} className="animate-pulse" style={{ animationDelay: `${idx * 180}ms` }}>
                <circle cx={line.x1} cy={line.y1} r="4" fill="#38BDF8" />
                <circle cx={line.x2} cy={line.y2} r="4" fill="#22C55E" />
                <line
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="#38BDF8"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  opacity="0.8"
                />
              </g>
            ))}
          </svg>

          <div className="relative z-10 flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-full border border-slate-700 text-xs text-white">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>Active Correspondence Search</span>
          </div>
        </div>

        {/* Progress Stages List */}
        <div className="space-y-4">
          {stages.map((stg, i) => {
            const isFinished = stage > i;
            const isCurrent = stage === i;

            return (
              <div
                key={i}
                className={`flex items-start gap-3.5 p-3 rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-blue-50/70 border border-blue-200'
                    : isFinished
                    ? 'bg-slate-50 border border-slate-200/60'
                    : 'opacity-40 border border-transparent'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isFinished ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : isCurrent ? (
                    <div className="w-5 h-5 border-2 border-blue-300 border-t-[#2563EB] rounded-full animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                      {i + 1}
                    </div>
                  )}
                </div>
                <div>
                  <h4
                    className={`text-xs font-semibold ${
                      isCurrent
                        ? 'text-[#2563EB]'
                        : isFinished
                        ? 'text-slate-900'
                        : 'text-slate-500'
                    }`}
                  >
                    {stg.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {stg.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
