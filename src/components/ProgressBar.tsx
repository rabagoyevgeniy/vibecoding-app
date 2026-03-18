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
        <div className="mb-1 flex justify-between text-sm">
          <span style={{ color: "var(--text-muted)" }}>{label}</span>
          <span style={{ color: "var(--accent-light)" }}>
            {value}/{max}
          </span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ background: "var(--border)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: "var(--accent)" }}
        />
      </div>
    </div>
  );
}
