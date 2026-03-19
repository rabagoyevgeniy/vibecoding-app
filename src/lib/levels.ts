export interface LevelTier {
  level: number;
  nameKey: string;
  icon: string;
  minXP: number;
  maxXP: number; // XP needed to reach NEXT level
  color: string;
  glow: string;
}

export const LEVEL_TIERS: LevelTier[] = [
  { level: 1, nameKey: "levels.newbie",            icon: "🐣",  minXP: 0,   maxXP: 50,   color: "#8b8b9e", glow: "rgba(139,139,158,0.2)" },
  { level: 2, nameKey: "levels.script_kiddie",     icon: "💻",  minXP: 50,  maxXP: 120,  color: "#60a5fa", glow: "rgba(96,165,250,0.2)" },
  { level: 3, nameKey: "levels.builder",            icon: "🔨",  minXP: 120, maxXP: 220,  color: "#a78bfa", glow: "rgba(167,139,250,0.2)" },
  { level: 4, nameKey: "levels.hacker",             icon: "🧑‍💻", minXP: 220, maxXP: 350,  color: "#f59e0b", glow: "rgba(245,158,11,0.2)" },
  { level: 5, nameKey: "levels.operator",           icon: "⚡",  minXP: 350, maxXP: 520,  color: "#10b981", glow: "rgba(16,185,129,0.2)" },
  { level: 6, nameKey: "levels.automator",          icon: "🤖",  minXP: 520, maxXP: 720,  color: "#3b82f6", glow: "rgba(59,130,246,0.2)" },
  { level: 7, nameKey: "levels.system_architect",   icon: "👑",  minXP: 720, maxXP: 1000, color: "#eab308", glow: "rgba(234,179,8,0.2)" },
];

export function getLevelTier(xp: number): LevelTier {
  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_TIERS[i].minXP) return LEVEL_TIERS[i];
  }
  return LEVEL_TIERS[0];
}

export function getLevelProgress(xp: number): { current: number; needed: number; pct: number } {
  const tier = getLevelTier(xp);
  const current = xp - tier.minXP;
  const needed = tier.maxXP - tier.minXP;
  const pct = Math.min((current / needed) * 100, 100);
  return { current, needed, pct };
}

export function getNextTier(xp: number): LevelTier | null {
  const current = getLevelTier(xp);
  const idx = LEVEL_TIERS.findIndex((t) => t.level === current.level);
  return idx < LEVEL_TIERS.length - 1 ? LEVEL_TIERS[idx + 1] : null;
}
