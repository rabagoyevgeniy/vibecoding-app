"use client";

interface Step {
  title: string;
  description: string;
}

interface StepListProps {
  steps: Step[];
  completedSteps: number[];
  onToggle: (index: number) => void;
  onSelectStep: (index: number) => void;
  activeStep: number;
}

export function StepList({
  steps,
  completedSteps,
  onToggle,
  onSelectStep,
  activeStep,
}: StepListProps) {
  return (
    <div className="flex flex-col gap-2">
      {steps.map((step, i) => {
        const done = completedSteps.includes(i);
        const isActive = activeStep === i;

        return (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl p-4 transition-all cursor-pointer"
            style={{
              background: isActive ? "var(--bg-card-hover)" : "var(--bg-card)",
              border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
            }}
            onClick={() => onSelectStep(i)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(i);
              }}
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all"
              style={{
                background: done ? "var(--success)" : "transparent",
                border: done ? "none" : "2px solid var(--border)",
                color: done ? "#fff" : "var(--text-muted)",
              }}
            >
              {done ? "✓" : i + 1}
            </button>
            <div>
              <div
                className="font-medium"
                style={{
                  textDecoration: done ? "line-through" : "none",
                  opacity: done ? 0.6 : 1,
                }}
              >
                {step.title}
              </div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {step.description}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
