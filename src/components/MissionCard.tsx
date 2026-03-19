"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
  const isLocked = status === "locked";

  return (
    <Link
      href={isLocked ? "#" : `/mission/${day}`}
      className="block p-5 transition-all duration-200"
      style={{
        background: status === "active" ? "var(--bg-card-hover)" : "var(--bg-card)",
        border: `1px solid ${status === "active" ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        boxShadow: status === "active" ? "var(--shadow-glow)" : "var(--shadow-sm)",
        opacity: isLocked ? 0.45 : 1,
        cursor: isLocked ? "not-allowed" : "pointer",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center text-sm font-bold"
            style={{
              background:
                status === "done"
                  ? "var(--success)"
                  : status === "active"
                    ? "var(--accent)"
                    : "var(--border-hover)",
              color: "#fff",
              borderRadius: "var(--radius-md)",
            }}
          >
            {status === "done" ? "✓" : day}
          </span>
          <h3 className="font-semibold">{title}</h3>
        </div>
        {status === "active" && (
          <span
            className="px-2.5 py-1 text-xs font-semibold"
            style={{
              background: "var(--accent-glow)",
              color: "var(--accent-light)",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--accent)",
            }}
          >
            {t("common.today")}
          </span>
        )}
      </div>
      <p className="mb-3 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {description}
      </p>
      {!isLocked && (
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 flex-1 overflow-hidden"
            style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-full)" }}
          >
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${(stepsCompleted / totalSteps) * 100}%`,
                background: status === "done"
                  ? "var(--success)"
                  : "linear-gradient(90deg, var(--accent), var(--accent-light))",
                borderRadius: "var(--radius-full)",
              }}
            />
          </div>
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            {stepsCompleted}/{totalSteps}
          </span>
        </div>
      )}
    </Link>
  );
}
