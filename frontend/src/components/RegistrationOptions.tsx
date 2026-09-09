import React from 'react';
import { Play } from 'lucide-react';
import { RegistrationOptionsState } from '../types';

interface RegistrationOptionsProps {
  options: RegistrationOptionsState;
  onChangeOptions: (updated: Partial<RegistrationOptionsState>) => void;
  onRunRegistration: () => void;
  isRunning: boolean;
  canRun: boolean;
}

export const RegistrationOptions: React.FC<RegistrationOptionsProps> = ({
  options,
  onChangeOptions,
  onRunRegistration,
  isRunning,
  canRun,
}) => {
  return (
    <div className="w-full lg:w-80 flex flex-col justify-between pt-1 border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-8 mt-6 lg:mt-0">
      {/* Options Toggles */}
      <div className="space-y-5">
        <h3 className="text-sm font-semibold text-slate-800">
          Options
        </h3>

        {/* Toggle 1: Spatial Filtering */}
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="toggle-spatial-filtering"
            className="text-xs sm:text-sm text-slate-700 font-medium cursor-pointer"
          >
            Use spatial filtering (recommended)
          </label>
          <button
            type="button"
            id="toggle-spatial-filtering"
            role="switch"
            aria-checked={options.spatialFiltering}
            onClick={() =>
              onChangeOptions({ spatialFiltering: !options.spatialFiltering })
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              options.spatialFiltering ? 'bg-[#2563EB]' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                options.spatialFiltering ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Toggle 2: CLAHE */}
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="toggle-clahe"
            className="text-xs sm:text-sm text-slate-700 font-medium cursor-pointer"
          >
            Contrast enhancement (CLAHE)
          </label>
          <button
            type="button"
            id="toggle-clahe"
            role="switch"
            aria-checked={options.contrastEnhancement}
            onClick={() =>
              onChangeOptions({
                contrastEnhancement: !options.contrastEnhancement,
              })
            }
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              options.contrastEnhancement ? 'bg-[#2563EB]' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                options.contrastEnhancement ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="pt-6">
        <button
          type="button"
          id="run-registration-btn"
          onClick={onRunRegistration}
          disabled={!canRun || isRunning}
          className={`w-full py-3 px-5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-md ${
            canRun && !isRunning
              ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-blue-500/20 active:scale-[0.99] cursor-pointer'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
          }`}
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Registering Tie Points...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white text-white" />
              <span>Run Registration</span>
            </>
          )}
        </button>
        {!canRun && (
          <p className="text-[11px] text-slate-400 text-center mt-2">
            Upload or select both source and reference images
          </p>
        )}
      </div>
    </div>
  );
};
