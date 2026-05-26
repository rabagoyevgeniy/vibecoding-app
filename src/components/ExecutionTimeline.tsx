"use client";

import React from 'react';

export type StepStatus = 'pending' | 'running' | 'completed' | 'error';

interface ExecutionTimelineProps {
  steps: string[];
  currentStep: number; // index of the currently running or last completed step
  statuses?: StepStatus[];
  onRetry?: (stepIndex: number) => void;
  errors?: (string | null)[];
  className?: string;
}

export function ExecutionTimeline({
  steps,
  currentStep,
  statuses,
  onRetry,
  errors,
  className = '',
}: ExecutionTimelineProps) {
  const getStatus = (index: number): StepStatus => {
    if (statuses && statuses[index]) return statuses[index];
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'running';
    return 'pending';
  };

  const getError = (index: number): string | null => {
    return errors && errors[index] ? errors[index] : null;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {steps.map((step, index) => {
        const status = getStatus(index);
        const error = getError(index);
        const isRunning = status === 'running';
        const isCompleted = status === 'completed';
        const isError = status === 'error' || !!error;

        return (
          <div key={index} className="flex items-start gap-3">
            {/* Status Icon / Spinner */}
            <div className="mt-0.5 flex-shrink-0">
              {isCompleted && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                  ✓
                </div>
              )}
              {isRunning && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)]/20">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                </div>
              )}
              {isError && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                  ✕
                </div>
              )}
              {status === 'pending' && (
                <div className="h-6 w-6 rounded-full border-2 border-gray-600" />
              )}
            </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <div 
                    className={`font-medium text-sm ${isCompleted ? 'text-green-400' : isError ? 'text-red-400' : 'text-[var(--text)]'}`}
                  >
                    {step}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider mt-0.5">
                    {isCompleted && <span className="text-green-400/80">ГОТОВО</span>}
                    {isRunning && <span className="text-[var(--accent)] animate-pulse">ВЫПОЛНЯЕТСЯ...</span>}
                    {isError && <span className="text-red-400">ОШИБКА ПРОВАЙДЕРА</span>}
                    {status === 'pending' && <span className="text-gray-500">В ОЧЕРЕДИ</span>}
                  </div>
                </div>

                {/* Retry Button on Error */}
                {isError && onRetry && (
                  <button
                    onClick={() => onRetry(index)}
                    className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                  >
                    Retry
                  </button>
                )}
              </div>

              {/* Error message */}
              {error && (
                <div className="mt-1 text-[10px] text-red-400/80 line-clamp-2">
                  {error}
                </div>
              )}
            </div>

            {/* Connecting line (except last) - better positioned */}
            {index < steps.length - 1 && (
              <div 
                className="w-px bg-[var(--border)]" 
                style={{ 
                  position: 'absolute', 
                  left: '11px', 
                  top: '28px', 
                  height: '20px' 
                }} 
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
