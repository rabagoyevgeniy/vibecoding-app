"use client";

import { useI18n } from "@/lib/i18n";
import type { SkillsData } from "@/lib/skills";
import { ALL_SKILLS, SKILL_ICONS, SKILL_COLORS, getTopSkill } from "@/lib/skills";

interface SkillsCardProps {
  skills: SkillsData;
}

export function SkillsCard({ skills }: SkillsCardProps) {
  const { t } = useI18n();
  const maxXP = Math.max(...Object.values(skills), 1);
  const topSkill = getTopSkill(skills);
  const total = Object.values(skills).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <div
        className="p-4 text-center text-sm"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          color: "var(--text-muted)",
        }}
      >
        {t("skills.empty")}
      </div>
    );
  }

  return (
    <div
      className="p-4"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      {/* Top skill badge */}
      {topSkill && (
        <div
          className="mb-4 inline-flex items-center gap-2 px-3 py-1.5"
          style={{
            background: `${SKILL_COLORS[topSkill]}15`,
            borderRadius: "var(--radius-full)",
            border: `1px solid ${SKILL_COLORS[topSkill]}30`,
          }}
        >
          <span className="text-sm">{SKILL_ICONS[topSkill]}</span>
          <span className="text-xs font-semibold" style={{ color: SKILL_COLORS[topSkill] }}>
            {t("skills.top_prefix")} {t(`skills.${topSkill}`)}
          </span>
        </div>
      )}

      {/* Skill bars */}
      <div className="flex flex-col gap-3">
        {ALL_SKILLS.map((skill) => {
          const xp = skills[skill];
          const pct = (xp / maxXP) * 100;
          const color = SKILL_COLORS[skill];

          return (
            <div key={skill}>
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm">
                  <span>{SKILL_ICONS[skill]}</span>
                  <span className="font-medium">{t(`skills.${skill}`)}</span>
                </div>
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  {xp} XP
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden"
                style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-full)" }}
              >
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: color,
                    borderRadius: "var(--radius-full)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
