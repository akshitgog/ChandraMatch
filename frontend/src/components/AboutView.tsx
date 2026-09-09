import React from 'react';
import { ShieldCheck, Cpu, Orbit } from 'lucide-react';
import { LUNAR_SENSORS } from '../data/lunarSensors';

export const AboutView: React.FC = () => {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs space-y-8">
      <div>
        <span className="text-[11px] font-bold text-[#2563EB] tracking-widest uppercase">
          SMART INDIA HACKATHON 2026
        </span>
        <h2 className="text-2xl font-bold text-slate-900 mt-1">
          ChandraMatch: Lunar Correspondence Engine
        </h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-3xl">
          ChandraMatch addresses the critical challenge of registering multi-resolution, multi-modal lunar remote sensing datasets collected by the Indian Space Research Organisation (ISRO) Chandrayaan-2 orbiter.
        </p>
      </div>

      {/* Sensor Specs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {LUNAR_SENSORS.map((s) => (
          <div
            key={s.id}
            className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-slate-900">{s.id}</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-100 text-blue-700 font-semibold">
                  {s.resolution}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700">{s.fullName}</p>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                {s.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[#2563EB] mt-0.5">•</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-slate-500">
              Payload: ISRO Chandrayaan-2
            </div>
          </div>
        ))}
      </div>

      {/* Technical Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-50 text-[#2563EB]">
            <Orbit className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Multi-Scale Alignment</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Handles wide Ground Sample Distance (GSD) ratios up to 1:250 between optical and hyperspectral frames.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Sub-Pixel Precision</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Achieves Root Mean Square Error (RMSE) &lt; 0.5 pixels using robust tie-point refinement.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Illumination Invariant</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Resistant to low solar incidence angles, harsh shadow casting, and polar crater morphology.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
