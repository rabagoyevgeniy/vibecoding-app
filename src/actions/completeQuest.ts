"use server";

/**
 * completeQuest — помечает smart quest как завершённый и начисляет XP.
 *
 * Вызывается после успешной проверки (`verifyQuest`) или Vision-анализа
 * (`analyzeScreenshot`), чтобы прогресс сохранялся в Supabase, а не только в UI.
 */

import { guardServerAction } from "@/lib/auth-guard";
import { incrementXp } from "@/lib/increment-xp";
import { createClient } from "@/lib/supabase-server";
import { mapSmartQuestRow, type SmartQuestRow } from "@/lib/smart-quests";
import type { SmartQuest } from "@/components/quests/SmartQuestCard";

export type CompleteQuestResult =
  | {
      success: true;
      quest: SmartQuest;
      xpAwarded: number;
      current_xp: number;
      new_level: number;
    }
  | { success: false; error: string };

const UNAUTHORIZED_RESULT: CompleteQuestResult = {
  success: false,
  error: "Сессия истекла. Войди в аккаунт, чтобы сохранить прогресс квеста.",
};

export async function completeQuest(
  questId: string,
  options?: { result?: string }
): Promise<CompleteQuestResult> {
  const guard = await guardServerAction<CompleteQuestResult>(() => UNAUTHORIZED_RESULT);
  if (!guard.ok) return guard.error;

  const userId = guard.user.id;

  if (typeof questId !== "string" || !questId.trim()) {
    return { success: false, error: "Некорректный questId." };
  }

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("smart_quests")
    .select("*")
    .eq("id", questId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { success: false, error: "Квест не найден или нет доступа." };
  }

  const row = existing as SmartQuestRow;

  if (row.status === "completed") {
    const quest = mapSmartQuestRow(row);
    const progress = await supabase
      .from("user_progress")
      .select("xp, level")
      .eq("user_id", userId)
      .maybeSingle();

    return {
      success: true,
      quest,
      xpAwarded: 0,
      current_xp: progress.data?.xp ?? 0,
      new_level: progress.data?.level ?? 1,
    };
  }

  const resultText =
    typeof options?.result === "string" && options.result.trim()
      ? options.result.trim()
      : row.result;

  const { data: updated, error: updateError } = await supabase
    .from("smart_quests")
    .update({
      status: "completed",
      result: resultText,
    })
    .eq("id", questId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("[completeQuest] update failed:", updateError);
    return { success: false, error: "Не удалось сохранить завершение квеста." };
  }

  const xpAwarded = Math.max(0, row.xp_reward ?? 50);
  let current_xp = 0;
  let new_level = 1;

  if (xpAwarded > 0) {
    const xpResult = await incrementXp(userId, xpAwarded);
    if (xpResult) {
      current_xp = xpResult.current_xp;
      new_level = xpResult.new_level;
    }
  } else {
    const { data: progress } = await supabase
      .from("user_progress")
      .select("xp, level")
      .eq("user_id", userId)
      .maybeSingle();
    current_xp = progress?.xp ?? 0;
    new_level = progress?.level ?? 1;
  }

  return {
    success: true,
    quest: mapSmartQuestRow(updated as SmartQuestRow),
    xpAwarded,
    current_xp,
    new_level,
  };
}
