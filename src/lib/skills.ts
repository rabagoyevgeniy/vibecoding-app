import type { SkillType } from "./missions-data";

export type SkillsData = Record<SkillType, number>;

const STORAGE_KEY = "vc_skills";
const XP_PER_STEP = 10;

const DEFAULT_SKILLS: SkillsData = { sales: 0, product: 0, content: 0, ai: 0 };

export function getSkills(): SkillsData {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? { ...DEFAULT_SKILLS, ...JSON.parse(raw) } : { ...DEFAULT_SKILLS };
}

export function addSkillXP(skill: SkillType): SkillsData {
  const skills = getSkills();
  skills[skill] += XP_PER_STEP;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
  return skills;
}

export function getTopSkill(skills: SkillsData): SkillType | null {
  const total = Object.values(skills).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return (Object.entries(skills) as [SkillType, number][])
    .sort((a, b) => b[1] - a[1])[0][0];
}

export const SKILL_ICONS: Record<SkillType, string> = {
  sales: "🎯",
  product: "🛠️",
  content: "✍️",
  ai: "🤖",
};

export const SKILL_COLORS: Record<SkillType, string> = {
  sales: "#f59e0b",
  product: "#8b5cf6",
  content: "#10b981",
  ai: "#3b82f6",
};

export const ALL_SKILLS: SkillType[] = ["sales", "product", "content", "ai"];
