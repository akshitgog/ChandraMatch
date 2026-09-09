import React from 'react';
import { WorkflowStep } from '../types';

interface StepIndicatorProps {
  currentStep: WorkflowStep;
  onSelectStep: (step: WorkflowStep) => void;
  canNavigateToStep?: (step: WorkflowStep) => boolean;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  onSelectStep,
  canNavigateToStep,
}) => {
  const steps = [
    { number: 1 as WorkflowStep, title: 'Select Images' },
    { number: 2 as WorkflowStep, title: 'Register' },
    { number: 3 as WorkflowStep, title: 'View Results' },
  ];

  return (
    <div className="flex items-center gap-6 sm:gap-10 pb-5">
      {steps.map((step) => {
        const isActive = currentStep === step.number;
        const isPast = currentStep > step.number;
        const isClickable = canNavigateToStep ? canNavigateToStep(step.number) : true;

        return (
          <button
            key={step.number}
            type="button"
            onClick={() => isClickable && onSelectStep(step.number)}
            disabled={!isClickable}
            className={`flex items-center gap-2.5 transition-colors group cursor-pointer ${
              !isClickable ? 'cursor-not-allowed opacity-60' : ''
            }`}
          >
            {/* Step Number Circle */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isActive
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : isPast
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {step.number}
            </div>

            {/* Step Label */}
            <span
              className={`text-sm font-semibold tracking-tight transition-colors ${
                isActive
                  ? 'text-slate-900'
                  : isPast
                  ? 'text-slate-700 hover:text-slate-900'
                  : 'text-slate-500'
              }`}
            >
              {step.title}
            </span>
          </button>
        );
      })}
    </div>
  );
};
