"use client";

import { useI18n } from "@/lib/i18n";
import type { MissionStep } from "@/lib/missions-data";

interface StepListProps {
  steps: MissionStep[];
  completedSteps: number[];
  onToggle: (index: number) => void;
  onEdit: (index: number) => void;
  onSelectStep: (index: number) => void;
  activeStep: number;
}

export function StepList({
  steps,
  completedSteps,
  onToggle,
  onEdit,
  onSelectStep,
  activeStep,
}: StepListProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-2">
      {steps.map((step, i) => {
        const done = completedSteps.includes(i);
        const isActive = activeStep === i;

        return (
          <div
            key={i}
            className="flex items-start gap-3 p-4 transition-all duration-200 cursor-pointer"
            style={{
              background: isActive ? "var(--bg-card-hover)" : "var(--bg-card)",
              border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
              borderRadius: "var(--radius-lg)",
              boxShadow: isActive ? "var(--shadow-glow)" : "none",
            }}
            onClick={() => {
              onSelectStep(i);
              if (done) {
                onEdit(i);
              } else {
                onToggle(i);
              }
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(i);
              }}
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-xs font-bold transition-all duration-200"
              style={{
                background: done ? "var(--success)" : "transparent",
                border: done ? "none" : "2px solid var(--border-hover)",
                color: done ? "#fff" : "var(--text-muted)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {done ? "✓" : i + 1}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium" style={{ opacity: done ? 0.7 : 1 }}>
                  {t(step.titleKey)}
                </span>
                {done && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(i);
                    }}
                    className="shrink-0 px-2 py-0.5 text-xs font-medium transition-all duration-200"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    {t("step_modal.edit")}
                  </button>
                )}
              </div>
              <div className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {t(step.descKey)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
