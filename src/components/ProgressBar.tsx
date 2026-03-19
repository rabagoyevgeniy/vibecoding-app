"use client";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
}

export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div>
      {label && (
        <div className="mb-1.5 flex justify-between text-sm">
          <span style={{ color: "var(--text-muted)" }}>{label}</span>
          <span className="font-medium" style={{ color: "var(--accent-light)" }}>
            {value}/{max}
          </span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden"
        style={{ background: "var(--bg-card)", borderRadius: "var(--radius-full)" }}
      >
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--accent), var(--accent-light))",
            borderRadius: "var(--radius-full)",
          }}
        />
      </div>
    </div>
  );
}
