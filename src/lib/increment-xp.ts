/**
 * incrementXp — серверная запись XP в `user_progress`.
 *
 * Используется из Server Actions (`completeQuest` и др.), где нельзя
 * полагаться на browser Supabase client из `supabase-storage.ts`.
 * Уровень считается только через `getLevelTier()` — единый источник истины.
 */

import { createClient } from "@/lib/supabase-server";
import { getLevelTier } from "@/lib/levels";

export async function incrementXp(
  userId: string,
  xpToAdd: number
): Promise<{ current_xp: number; new_level: number } | null> {
  if (!userId?.trim() || !Number.isFinite(xpToAdd) || xpToAdd <= 0) {
    return null;
  }

  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from("user_progress")
    .select("current_day, xp, level, skills")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    console.error("[incrementXp] fetch user_progress failed:", fetchError);
    return null;
  }

  const oldXp = current?.xp ?? 0;
  const newXp = oldXp + xpToAdd;
  const newLevel = getLevelTier(newXp).level;

  const { error: upsertError } = await supabase.from("user_progress").upsert(
    {
      user_id: userId,
      xp: newXp,
      level: newLevel,
      current_day: current?.current_day ?? 1,
      skills: current?.skills ?? { sales: 0, product: 0, content: 0, ai: 0 },
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    console.error("[incrementXp] upsert user_progress failed:", upsertError);
    return null;
  }

  return { current_xp: newXp, new_level: newLevel };
}
