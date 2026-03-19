"use client";

import { useI18n } from "@/lib/i18n";
import type { SideQuest } from "@/lib/missions-data";
import { SKILL_ICONS, SKILL_COLORS } from "@/lib/skills";

interface SideQuestsProps {
  quests: SideQuest[];
  completedQuests: number[];
  onToggle: (index: number) => void;
}

export function SideQuests({ quests, completedQuests, onToggle }: SideQuestsProps) {
  const { t } = useI18n();

  if (quests.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <span style={{ color: "var(--warning)" }}>⭐</span>
        {t("side_quests.title")}
        <span
          className="px-2 py-0.5 text-xs font-normal"
          style={{
            color: "var(--text-muted)",
            background: "var(--bg-card)",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--border)",
          }}
        >
          {t("side_quests.optional")}
        </span>
      </h2>
      <div className="flex flex-col gap-2">
        {quests.map((quest, i) => {
          const done = completedQuests.includes(i);
          const color = SKILL_COLORS[quest.skill];

          return (
            <div
              key={i}
              className="flex items-center gap-3 p-3 cursor-pointer transition-all duration-200"
              style={{
                background: done ? `${color}10` : "var(--bg-card)",
                border: `1px solid ${done ? `${color}40` : "var(--border)"}`,
                borderRadius: "var(--radius-md)",
              }}
              onClick={() => onToggle(i)}
            >
              <button
                className="flex h-5 w-5 shrink-0 items-center justify-center text-xs font-bold transition-all duration-200"
                style={{
                  background: done ? color : "transparent",
                  border: done ? "none" : `2px solid var(--border-hover)`,
                  color: done ? "#fff" : "var(--text-muted)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {done ? "✓" : ""}
              </button>

              <div className="flex-1 min-w-0">
                <span
                  className="text-sm font-medium"
                  style={{ opacity: done ? 0.7 : 1 }}
                >
                  {t(quest.titleKey)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs">{SKILL_ICONS[quest.skill]}</span>
                <span
                  className="px-2 py-0.5 text-xs font-semibold"
                  style={{
                    background: `${color}20`,
                    color,
                    borderRadius: "var(--radius-full)",
                  }}
                >
                  +{quest.xp} XP
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
