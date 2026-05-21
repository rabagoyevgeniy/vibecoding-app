import { createClient } from "@/lib/supabase-browser";
import { getLevelTier } from "@/lib/levels";

/**
 * Supabase Storage Layer — replaces localStorage persistence for authenticated users.
 *
 * All functions are fully defensive:
 * - If userId is falsy → graceful return (null / {} / void)
 * - All Supabase errors are caught and logged; never throw to UI
 * - Exact match to tables in supabase/schema_v2.sql
 */

const supabase = createClient();

// ============================================================================
// TYPES (match schema_v2 + current app expectations)
// ============================================================================

export interface UserProgress {
  current_day: number;
  xp: number;
  level: number;
  skills?: Record<"sales" | "product" | "content" | "ai", number>;
}

export interface StepResponse {
  day: number;
  step_index: number;
  response_text: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function isValidUserId(userId: unknown): userId is string {
  return typeof userId === "string" && userId.trim().length > 0;
}

function normalizeSkills(skills: unknown): Record<"sales" | "product" | "content" | "ai", number> {
  const defaults = { sales: 0, product: 0, content: 0, ai: 0 };
  if (skills && typeof skills === "object" && !Array.isArray(skills)) {
    return {
      sales: Number((skills as any).sales) || 0,
      product: Number((skills as any).product) || 0,
      content: Number((skills as any).content) || 0,
      ai: Number((skills as any).ai) || 0,
    };
  }
  return defaults;
}

// ============================================================================
// USER PROGRESS
// ============================================================================

/**
 * Fetch persisted progress for a user.
 * Returns null if no row exists yet (new user) or userId is invalid.
 */
export async function fetchUserProgress(userId: string): Promise<UserProgress | null> {
  if (!isValidUserId(userId)) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("user_progress")
      .select("current_day, xp, level, skills")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      // Row does not exist yet — this is normal for new users
      return null;
    }

    return {
      current_day: data.current_day ?? 1,
      xp: data.xp ?? 0,
      level: data.level ?? 1,
      skills: normalizeSkills(data.skills),
    };
  } catch (err) {
    console.error("[supabase-storage] fetchUserProgress failed:", err);
    return null;
  }
}

/**
 * Save (upsert) progress fields for a user.
 * Accepts Partial so you can update only xp, only skills, only current_day, etc.
 * Other columns in the row are left untouched by Supabase.
 */
export async function saveUserProgress(
  userId: string,
  progress: Partial<UserProgress>
): Promise<void> {
  if (!isValidUserId(userId)) {
    return;
  }

  try {
    const payload: Record<string, unknown> = {
      user_id: userId,
      ...progress,
    };

    // Ensure skills is a plain object (jsonb)
    if (progress.skills) {
      payload.skills = normalizeSkills(progress.skills);
    }

    const { error } = await supabase
      .from("user_progress")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      console.error("[supabase-storage] saveUserProgress failed:", error);
    }
  } catch (err) {
    console.error("[supabase-storage] saveUserProgress exception:", err);
  }
}

// ============================================================================
// STEP RESPONSES
// ============================================================================

/**
 * Save a single step answer (idempotent upsert).
 * Uses the exact unique constraint from schema_v2.sql.
 */
export async function saveStepResponse(
  userId: string,
  day: number,
  stepIndex: number,
  responseText: string
): Promise<void> {
  if (!isValidUserId(userId)) {
    return;
  }

  try {
    const { error } = await supabase.from("user_step_responses").upsert(
      {
        user_id: userId,
        day,
        step_index: stepIndex,
        response_text: responseText,
      },
      { onConflict: "user_id,day,step_index" }
    );

    if (error) {
      console.error("[supabase-storage] saveStepResponse failed:", error);
    }
  } catch (err) {
    console.error("[supabase-storage] saveStepResponse exception:", err);
  }
}

/**
 * Fetch ALL responses for a given day and return them as a convenient map:
 *   { 0: "answer for step 0", 1: "answer for step 1", ... }
 *
 * Used by mission pages to prefill StepModal etc.
 */
export async function fetchDayResponses(
  userId: string,
  day: number
): Promise<Record<number, string>> {
  if (!isValidUserId(userId)) {
    return {};
  }

  try {
    const { data, error } = await supabase
      .from("user_step_responses")
      .select("step_index, response_text")
      .eq("user_id", userId)
      .eq("day", day)
      .order("step_index", { ascending: true });

    if (error || !data) {
      return {};
    }

    const map: Record<number, string> = {};
    for (const row of data) {
      if (typeof row.step_index === "number") {
        map[row.step_index] = row.response_text ?? "";
      }
    }
    return map;
  } catch (err) {
    console.error("[supabase-storage] fetchDayResponses failed:", err);
    return {};
  }
}

// ============================================================================
// XP + LEVEL (gamification core)
// ============================================================================

/**
 * Atomically add XP, recalculate level using the official tier system,
 * persist the new values, and return them.
 *
 * Formula / rules taken from:
 *  - src/lib/progress.ts (Math.floor + inferred logic)
 *  - src/lib/levels.ts (authoritative LEVEL_TIERS + getLevelTier)
 *
 * Level is always derived from XP via getLevelTier(xp).level to stay in sync with UI.
 */
export async function incrementXpAndCheckLevel(
  userId: string,
  xpToAdd: number
): Promise<{ current_xp: number; new_level: number } | null> {
  if (!isValidUserId(userId) || !Number.isFinite(xpToAdd) || xpToAdd <= 0) {
    return null;
  }

  try {
    // 1. Read current state (or treat as fresh user)
    const current = await fetchUserProgress(userId);

    const oldXp = current?.xp ?? 0;
    const currentDay = current?.current_day ?? 1;
    const currentSkills = current?.skills ?? { sales: 0, product: 0, content: 0, ai: 0 };

    const newXp = oldXp + xpToAdd;

    // 2. Authoritative level calculation (matches dashboard/profile UI)
    const tier = getLevelTier(newXp);
    const newLevel = tier.level;

    // 3. Persist (partial upsert — current_day and skills are preserved)
    const { error } = await supabase.from("user_progress").upsert(
      {
        user_id: userId,
        xp: newXp,
        level: newLevel,
        current_day: currentDay,
        skills: currentSkills,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("[supabase-storage] incrementXpAndCheckLevel upsert failed:", error);
      // Still return the calculated values so UI can react even if persistence lagged
    }

    return { current_xp: newXp, new_level: newLevel };
  } catch (err) {
    console.error("[supabase-storage] incrementXpAndCheckLevel exception:", err);
    return null;
  }
}

// ============================================================================
// LOCAL → SUPABASE MIGRATION (called on login)
// ============================================================================

/**
 * One-time migration helper.
 * Called after successful authentication to push any existing localStorage
 * progress, skills and step responses into Supabase so the user doesn't lose
 * their offline progress.
 */
export async function syncLocalStorageToSupabase(userId: string): Promise<void> {
  if (typeof window === "undefined" || !userId) return;

  try {
    // --- 1. Progress (xp, level, current_day) ---
    const rawProgress = localStorage.getItem("vc_progress");
    if (rawProgress) {
      const localP = JSON.parse(rawProgress) as {
        current_day?: number;
        xp?: number;
        level?: number;
      };

      const cloud = await fetchUserProgress(userId);

      // Push local if it has more progress or cloud is empty
      if (!cloud || (localP.xp ?? 0) > (cloud.xp ?? 0)) {
        await saveUserProgress(userId, {
          current_day: localP.current_day ?? cloud?.current_day ?? 1,
          xp: localP.xp ?? 0,
          level: localP.level ?? 1,
        });
      }
    }

    // --- 2. Skills (merge taking the maximum per skill) ---
    const rawSkills = localStorage.getItem("vc_skills");
    if (rawSkills) {
      const localSkills: Record<string, number> = JSON.parse(rawSkills);

      const cloud = await fetchUserProgress(userId);
      const base = cloud?.skills ?? { sales: 0, product: 0, content: 0, ai: 0 };

      const merged: any = { ...base };
      (["sales", "product", "content", "ai"] as const).forEach((s) => {
        merged[s] = Math.max(base[s] ?? 0, localSkills[s] ?? 0);
      });

      await saveUserProgress(userId, { skills: merged });
    }

    // --- 3. Step responses ---
    const responseKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("vc_response_")) responseKeys.push(k);
    }

    for (const key of responseKeys) {
      const match = key.match(/^vc_response_(\d+)_(\d+)$/);
      if (match) {
        const day = parseInt(match[1], 10);
        const stepIndex = parseInt(match[2], 10);
        const text = localStorage.getItem(key);
        if (text) {
          await saveStepResponse(userId, day, stepIndex, text);
        }
      }
    }

    // --- 4. Completed steps (vc_steps_*) ---
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const match = key?.match(/^vc_steps_(\d+)$/);
      if (key && match) {
        const day = parseInt(match[1], 10);
        try {
          const steps: number[] = JSON.parse(localStorage.getItem(key) || "[]");
          for (const stepIndex of steps) {
            await markStepCompleted(userId, day, stepIndex, false);
          }
        } catch {}
      }
    }

    // --- 5. Side quests (vc_sidequests_*) ---
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const match = key?.match(/^vc_sidequests_(\d+)$/);
      if (key && match) {
        const day = parseInt(match[1], 10);
        try {
          const quests: number[] = JSON.parse(localStorage.getItem(key) || "[]");
          for (const q of quests) {
            await markStepCompleted(userId, day, q, true);
          }
        } catch {}
      }
    }

    // --- 6. Leads ---
    const rawLeads = localStorage.getItem("vc_leads");
    if (rawLeads) {
      try {
        const leads = JSON.parse(rawLeads);
        if (Array.isArray(leads) && leads.length > 0) {
          await saveLeads(userId, leads);
        }
      } catch {}
    }

    // --- 7. Artifacts ---
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const match = key?.match(/^vc_artifact_(\d+)$/);
      if (key && match) {
        const day = parseInt(match[1], 10);
        try {
          const artifact = JSON.parse(localStorage.getItem(key) || "null");
          if (artifact) {
            await saveArtifact(userId, day, artifact);
          }
        } catch {}
      }
    }
  } catch (err) {
    console.error("[supabase-storage] syncLocalStorageToSupabase failed:", err);
  }
}

// ============================================================================
// COMPLETED STEPS + SIDE QUESTS (user_step_completions)
// ============================================================================

export async function markStepCompleted(
  userId: string,
  day: number,
  stepIndex: number | null,
  isSidequest = false
): Promise<void> {
  if (!isValidUserId(userId)) return;

  try {
    const { error } = await supabase.from("user_step_completions").upsert(
      {
        user_id: userId,
        day,
        step_index: stepIndex,
        is_sidequest: isSidequest,
      },
      { onConflict: "user_id,day,step_index,is_sidequest" }
    );

    if (error) {
      console.error("[supabase-storage] markStepCompleted failed:", error);
    }
  } catch (err) {
    console.error("[supabase-storage] markStepCompleted exception:", err);
  }
}

export async function fetchCompletedStepsForDay(userId: string, day: number): Promise<number[]> {
  if (!isValidUserId(userId)) return [];

  try {
    const { data, error } = await supabase
      .from("user_step_completions")
      .select("step_index")
      .eq("user_id", userId)
      .eq("day", day)
      .eq("is_sidequest", false);

    if (error || !data) return [];

    return data
      .map((r: any) => r.step_index)
      .filter((n: any): n is number => typeof n === "number");
  } catch (err) {
    console.error("[supabase-storage] fetchCompletedStepsForDay failed:", err);
    return [];
  }
}

export async function fetchSideQuestsForDay(userId: string, day: number): Promise<number[]> {
  if (!isValidUserId(userId)) return [];

  try {
    const { data, error } = await supabase
      .from("user_step_completions")
      .select("step_index")
      .eq("user_id", userId)
      .eq("day", day)
      .eq("is_sidequest", true);

    if (error || !data) return [];

    return data
      .map((r: any) => r.step_index)
      .filter((n: any): n is number => typeof n === "number");
  } catch (err) {
    console.error("[supabase-storage] fetchSideQuestsForDay failed:", err);
    return [];
  }
}

// ============================================================================
// LEADS (user_leads)
// ============================================================================

export interface StoredLead {
  id?: string;
  name: string;
  platform?: string;
  status?: string;
  type?: string;
  day?: number;
  contact?: any;
  notes?: any;
}

export async function fetchLeads(userId: string): Promise<StoredLead[]> {
  if (!isValidUserId(userId)) return [];

  try {
    const { data, error } = await supabase
      .from("user_leads")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as StoredLead[];
  } catch (err) {
    console.error("[supabase-storage] fetchLeads failed:", err);
    return [];
  }
}

export async function saveLeads(userId: string, leads: StoredLead[]): Promise<void> {
  if (!isValidUserId(userId)) return;

  try {
    // Simple strategy: delete old + insert new (or use upsert by name+day)
    await supabase.from("user_leads").delete().eq("user_id", userId);

    if (leads.length === 0) return;

    const rows = leads.map((lead) => ({
      user_id: userId,
      name: lead.name,
      platform: lead.platform,
      status: lead.status || "no_reply",
      type: lead.type,
      day: lead.day,
      contact: lead.contact,
      notes: lead.notes,
    }));

    const { error } = await supabase.from("user_leads").insert(rows);
    if (error) {
      console.error("[supabase-storage] saveLeads failed:", error);
    }
  } catch (err) {
    console.error("[supabase-storage] saveLeads exception:", err);
  }
}

// ============================================================================
// ARTIFACTS (user_artifacts)
// ============================================================================

export async function fetchArtifact(userId: string, day: number): Promise<any | null> {
  if (!isValidUserId(userId)) return null;

  try {
    const { data, error } = await supabase
      .from("user_artifacts")
      .select("content, artifact_type")
      .eq("user_id", userId)
      .eq("day", day)
      .single();

    if (error || !data) return null;
    return data.content;
  } catch (err) {
    console.error("[supabase-storage] fetchArtifact failed:", err);
    return null;
  }
}

export async function saveArtifact(
  userId: string,
  day: number,
  artifact: any,
  artifactType = "Business Artifact"
): Promise<void> {
  if (!isValidUserId(userId)) return;

  try {
    const { error } = await supabase.from("user_artifacts").upsert(
      {
        user_id: userId,
        day,
        artifact_type: artifactType,
        content: artifact,
      },
      { onConflict: "user_id,day" }
    );

    if (error) {
      console.error("[supabase-storage] saveArtifact failed:", error);
    }
  } catch (err) {
    console.error("[supabase-storage] saveArtifact exception:", err);
  }
}
