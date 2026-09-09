import React from 'react';
import { LUNAR_SENSORS } from '../data/lunarSensors';
import { SensorType } from '../types';

interface SensorsShowcaseProps {
  onLoadAsSource: (sensor: SensorType, url: string, name: string) => void;
  onLoadAsReference: (sensor: SensorType, url: string, name: string) => void;
}

export const SensorsShowcase: React.FC<SensorsShowcaseProps> = ({
  onLoadAsSource,
  onLoadAsReference,
}) => {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs mt-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
        {/* Left Column: Slogan */}
        <div className="shrink-0">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Three Sensors.
          </h2>
          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#2563EB] leading-tight">
            One Lunar Surface.
          </h3>
          <div className="w-8 h-0.5 bg-[#2563EB] rounded-full mt-3" />
        </div>

        {/* Right Column: 3 Sensor Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full lg:max-w-3xl">
          {LUNAR_SENSORS.map((sensor) => (
            <div
              key={sensor.id}
              className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              {/* Image Thumbnail */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200 shadow-2xs group-hover:shadow-sm transition-all">
                <img
                  src={sensor.sampleUrl}
                  alt={sensor.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Text Info */}
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900 leading-tight">
                  {sensor.id}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                  {sensor.description}
                </p>
                <p className="text-[11px] font-mono text-slate-400 mt-1 leading-tight">
                  {sensor.resolution}
                </p>

                {/* Quick 1-click loaders */}
                <div className="flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() =>
                      onLoadAsSource(
                        sensor.id,
                        sensor.sampleUrl,
                        `ch2_${sensor.id.toLowerCase()}_sample.png`
                      )
                    }
                    className="text-[10px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    + Source
                  </button>
                  <span className="text-slate-300 text-[10px]">•</span>
                  <button
                    type="button"
                    onClick={() =>
                      onLoadAsReference(
                        sensor.id,
                        sensor.sampleUrl,
                        `ch2_${sensor.id.toLowerCase()}_sample.png`
                      )
                    }
                    className="text-[10px] font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                  >
                    + Ref
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
