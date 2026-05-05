import { createClient } from "@/lib/supabase-browser";
import { getCompletedStepCount } from "@/lib/progress";

export interface PlanStep {
  order: number;
  title: string;
  description: string;
  type: "input" | "confirm" | "ai";
  skill: "sales" | "product" | "content" | "ai";
  xp: number;
}

export interface PlanDay {
  day: number;
  title: string;
  description: string;
  steps: PlanStep[];
}

export type PlanDayStatus = "active" | "locked" | "completed";

export interface StoredPlanDay extends PlanDay {
  status: PlanDayStatus;
}

export interface Plan {
  suggested_idea: string;
  plan_summary: string;
  days: PlanDay[];
}

/** Generate a plan via AI and save to Supabase */
export async function generateAndSavePlan(
  userId: string,
  onboardingData: {
    goal: string;
    experience: string;
    timePerDay: string;
    idea: string;
  },
  language: string
): Promise<Plan | null> {
  try {
    const res = await fetch("/api/ai/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...onboardingData, language }),
    });

    if (!res.ok) return null;

    const { plan } = await res.json();
    if (!plan) return null;

    const supabase = createClient();

    // Save plan to vc_plans
    const { data: savedPlan, error: planError } = await supabase
      .from("vc_plans")
      .upsert(
        {
          user_id: userId,
          plan_json: plan,
          niche: plan.suggested_idea || "",
          is_active: true,
        },
        { onConflict: "user_id" }
      )
      .select("id")
      .single();

    if (planError) {
      console.error("Error saving plan:", planError);
      return plan;
    }

    // Save individual days to vc_plan_days
    if (savedPlan?.id && plan.days) {
      const dayRows = plan.days.map((day: PlanDay) => ({
        plan_id: savedPlan.id,
        user_id: userId,
        day_number: day.day,
        title: day.title,
        description: day.description,
        steps: day.steps,
        status: day.day === 1 ? "active" : "locked",
      }));

      // Delete old days first, then insert new
      await supabase
        .from("vc_plan_days")
        .delete()
        .eq("plan_id", savedPlan.id);

      await supabase.from("vc_plan_days").insert(dayRows);
    }

    return plan;
  } catch (error) {
    console.error("Plan generation failed:", error);
    return null;
  }
}

/** Get user's active plan */
export async function getUserPlan(userId: string): Promise<Plan | null> {
  const supabase = createClient();

  const { data } = await supabase
    .from("vc_plans")
    .select("plan_json")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  return (data?.plan_json as Plan) ?? null;
}

/** Get a specific day from the user's plan */
export async function getPlanDay(
  userId: string,
  dayNumber: number
): Promise<StoredPlanDay | null> {
  const supabase = createClient();

  const { data } = await supabase
    .from("vc_plan_days")
    .select("*")
    .eq("user_id", userId)
    .eq("day_number", dayNumber)
    .single();

  if (!data) return null;

  return {
    day: data.day_number,
    title: data.title,
    description: data.description,
    steps: data.steps as PlanStep[],
    status: normalizeStatus(data.status),
  };
}

/** Get all plan days for user */
export async function getAllPlanDays(userId: string): Promise<StoredPlanDay[]> {
  const supabase = createClient();

  const { data } = await supabase
    .from("vc_plan_days")
    .select("*")
    .eq("user_id", userId)
    .order("day_number");

  if (!data) return [];

  return data.map((d) => ({
    day: d.day_number,
    title: d.title,
    description: d.description,
    steps: d.steps as PlanStep[],
    status: normalizeStatus(d.status),
  }));
}

export async function updatePlanDayStatus(
  userId: string,
  dayNumber: number,
  status: PlanDayStatus
) {
  const supabase = createClient();

  const { error } = await supabase
    .from("vc_plan_days")
    .update({ status })
    .eq("user_id", userId)
    .eq("day_number", dayNumber);

  if (error) {
    console.error(`Failed to update plan day ${dayNumber}:`, error);
  }
}

export async function markPlanDayCompleted(userId: string, dayNumber: number) {
  const supabase = createClient();

  const [currentResult, nextResult] = await Promise.all([
    supabase
      .from("vc_plan_days")
      .update({ status: "completed" })
      .eq("user_id", userId)
      .eq("day_number", dayNumber),
    supabase
      .from("vc_plan_days")
      .update({ status: "active" })
      .eq("user_id", userId)
      .eq("day_number", dayNumber + 1)
      .neq("status", "completed"),
  ]);

  if (currentResult.error) {
    console.error(`Failed to complete plan day ${dayNumber}:`, currentResult.error);
  }

  if (nextResult.error) {
    console.error(`Failed to unlock plan day ${dayNumber + 1}:`, nextResult.error);
  }
}

export async function syncPlanDayStatuses(
  userId: string,
  days: StoredPlanDay[]
): Promise<StoredPlanDay[]> {
  if (days.length === 0) return [];

  const completedDays = new Set<number>();

  for (const day of days) {
    if (day.status === "completed" || getCompletedStepCount(day.day) >= day.steps.length) {
      completedDays.add(day.day);
    }
  }

  let activeAssigned = false;
  const syncedDays = days.map((day) => {
    let status: PlanDayStatus;

    if (completedDays.has(day.day)) {
      status = "completed";
    } else if (!activeAssigned) {
      status = "active";
      activeAssigned = true;
    } else {
      status = "locked";
    }

    return {
      ...day,
      status,
    };
  });

  const updates = syncedDays.filter((day, index) => day.status !== days[index]?.status);
  await Promise.all(
    updates.map((day) => updatePlanDayStatus(userId, day.day, day.status))
  );

  return syncedDays;
}

/** Get user's onboarding profile */
export async function getUserProfile(userId: string) {
  const supabase = createClient();

  const { data } = await supabase
    .from("vc_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  return data;
}

function normalizeStatus(status: unknown): PlanDayStatus {
  if (status === "completed" || status === "locked" || status === "active") {
    return status;
  }

  return "locked";
}
