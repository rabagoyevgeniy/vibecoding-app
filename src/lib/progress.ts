import { incrementXpAndCheckLevel } from "./supabase-storage";

export interface ProgressData {
  current_day: number;
  xp: number;
  level: number;
}

export interface ProgressDay {
  day: number;
  steps: Array<{ xp?: number }>;
  status?: string;
}

export const DEFAULT_PROGRESS: ProgressData = {
  current_day: 1,
  xp: 0,
  level: 1,
};

function isValidProgress(value: unknown): value is ProgressData {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ProgressData>;
  return (
    Number.isInteger(candidate.current_day) &&
    Number.isInteger(candidate.xp) &&
    Number.isInteger(candidate.level)
  );
}

export function getStoredProgress(): ProgressData | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("vc_progress");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return isValidProgress(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setStoredProgress(progress: ProgressData) {
  if (typeof window === "undefined") return;
  localStorage.setItem("vc_progress", JSON.stringify(progress));
}

export function ensureStoredProgress(
  fallback: ProgressData = DEFAULT_PROGRESS
): ProgressData {
  const stored = getStoredProgress();
  if (stored) return stored;

  setStoredProgress(fallback);
  return fallback;
}

export function getStoredGoal(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("vc_goal");
}

export function setStoredGoal(goal: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("vc_goal", goal);
}

export function getCompletedSteps(day: number): number[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(`vc_steps_${day}`);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((step): step is number => Number.isInteger(step))
      : [];
  } catch {
    return [];
  }
}

export function getCompletedStepCount(day: number): number {
  return getCompletedSteps(day).length;
}

export function initializeProgressFromPlanDays(
  days: ProgressDay[]
): ProgressData {
  const completedDays = days.filter((day) => day.status === "completed");
  const totalDays = Math.max(days.length, 1);
  const xp = completedDays.reduce((sum, day) => {
    const stepsXp = day.steps.reduce((stepSum, step) => {
      return stepSum + (typeof step.xp === "number" ? step.xp : 20);
    }, 0);

    return sum + stepsXp + 50;
  }, 0);

  const currentDay =
    completedDays.length >= totalDays
      ? totalDays
      : Math.min(completedDays.length + 1, totalDays);

  return {
    current_day: currentDay,
    xp,
    level: Math.floor(xp / 100) + 1,
  };
}

export function mergeProgress(
  stored: ProgressData | null,
  inferred: ProgressData = DEFAULT_PROGRESS
): ProgressData {
  if (!stored) return inferred;

  const xp = Math.max(stored.xp, inferred.xp);
  const currentDay = Math.max(stored.current_day, inferred.current_day);

  return {
    current_day: currentDay,
    xp,
    level: Math.max(stored.level, inferred.level, Math.floor(xp / 100) + 1),
  };
}

/**
 * Hybrid cloud XP sync helper (for mission page & other award sites).
 * Call with void (fire-and-forget) after local progress update when user is logged in.
 */
export async function addXpToCloud(
  userId: string | null | undefined,
  amount: number
): Promise<void> {
  if (!userId || !Number.isFinite(amount) || amount <= 0) return;

  try {
    await incrementXpAndCheckLevel(userId, amount);
  } catch (err) {
    console.error("[progress] Failed to sync XP delta to Supabase:", err);
  }
}
