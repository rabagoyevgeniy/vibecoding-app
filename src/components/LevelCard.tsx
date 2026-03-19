"use client";

import { useI18n } from "@/lib/i18n";
import { getLevelTier, getLevelProgress, getNextTier } from "@/lib/levels";

interface LevelCardProps {
  xp: number;
  onShare: () => void;
}

export function LevelCard({ xp, onShare }: LevelCardProps) {
  const { t } = useI18n();
  const tier = getLevelTier(xp);
  const progress = getLevelProgress(xp);
  const next = getNextTier(xp);

  return (
    <div
      className="p-4"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      {/* Level badge + share */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center text-2xl"
            style={{
              background: `${tier.color}15`,
              border: `2px solid ${tier.color}40`,
              borderRadius: "var(--radius-md)",
              boxShadow: `0 0 16px ${tier.glow}`,
            }}
          >
            {tier.icon}
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: tier.color }}>
              {t(tier.nameKey)}
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {t("levels.level")} {tier.level} · {xp} XP
            </div>
          </div>
        </div>
        <button
          onClick={onShare}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:brightness-110"
          style={{
            background: "var(--accent)",
            color: "#fff",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          <span>📤</span>
          {t("levels.share")}
        </button>
      </div>

      {/* XP progress bar */}
      <div>
        <div className="mb-1.5 flex justify-between text-xs">
          <span style={{ color: "var(--text-muted)" }}>
            {next ? `${t("levels.xp_to")} ${t(next.nameKey)}` : t("levels.max_level")}
          </span>
          <span className="font-medium" style={{ color: tier.color }}>
            {progress.current}/{progress.needed} XP
          </span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden"
          style={{
            background: "var(--bg-elevated)",
            borderRadius: "var(--radius-full)",
          }}
        >
          <div
            className="h-full transition-all duration-700"
            style={{
              width: `${progress.pct}%`,
              background: `linear-gradient(90deg, ${tier.color}, ${tier.color}cc)`,
              borderRadius: "var(--radius-full)",
              boxShadow: `0 0 8px ${tier.glow}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
