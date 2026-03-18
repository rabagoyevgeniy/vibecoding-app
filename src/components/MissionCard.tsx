"use client";

import Link from "next/link";

interface MissionCardProps {
  day: number;
  title: string;
  description: string;
  status: "locked" | "active" | "done";
  stepsCompleted: number;
  totalSteps: number;
}

export function MissionCard({
  day,
  title,
  description,
  status,
  stepsCompleted,
  totalSteps,
}: MissionCardProps) {
  const isLocked = status === "locked";

  return (
    <Link
      href={isLocked ? "#" : `/mission/${day}`}
      className="block rounded-xl p-5 transition-all"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${status === "active" ? "var(--accent)" : "var(--border)"}`,
        opacity: isLocked ? 0.5 : 1,
        cursor: isLocked ? "not-allowed" : "pointer",
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
            style={{
              background:
                status === "done"
                  ? "var(--success)"
                  : status === "active"
                    ? "var(--accent)"
                    : "var(--border)",
              color: "#fff",
            }}
          >
            {status === "done" ? "✓" : day}
          </span>
          <h3 className="font-semibold">{title}</h3>
        </div>
        {status === "active" && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            TODAY
          </span>
        )}
      </div>
      <p className="mb-3 text-sm" style={{ color: "var(--text-muted)" }}>
        {description}
      </p>
      {!isLocked && (
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full"
            style={{ background: "var(--border)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${(stepsCompleted / totalSteps) * 100}%`,
                background: status === "done" ? "var(--success)" : "var(--accent)",
              }}
            />
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {stepsCompleted}/{totalSteps}
          </span>
        </div>
      )}
    </Link>
  );
}
