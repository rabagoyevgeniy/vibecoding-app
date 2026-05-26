"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase-browser";
import { generateAndSavePlan } from "@/lib/plan-engine";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { DEFAULT_PROGRESS, getStoredProgress, setStoredGoal, setStoredProgress } from "@/lib/progress";
import { hasCompletedOnboarding } from "@/lib/supabase-storage";

const TOTAL_STEPS = 5;

type Goal = "money" | "startup" | "ai" | "learn";
type Experience = "beginner" | "some" | "experienced";
type TimePerDay = "1-2h" | "3-4h" | "5h+";

interface OnboardingData {
  goal: Goal | null;
  experience: Experience | null;
  timePerDay: TimePerDay | null;
  idea: string;
}

const GOALS: { id: Goal; emoji: string }[] = [
  { id: "money", emoji: "💰" },
  { id: "startup", emoji: "🚀" },
  { id: "ai", emoji: "🤖" },
  { id: "learn", emoji: "📚" },
];

const EXPERIENCE_LEVELS: { id: Experience; emoji: string }[] = [
  { id: "beginner", emoji: "🌱" },
  { id: "some", emoji: "⚡" },
  { id: "experienced", emoji: "🔥" },
];

const TIME_OPTIONS: { id: TimePerDay; emoji: string }[] = [
  { id: "1-2h", emoji: "⏰" },
  { id: "3-4h", emoji: "🕐" },
  { id: "5h+", emoji: "💪" },
];

// Helper for AI idea suggestions (based on collected data)
function generateIdeaSuggestions(goal: Goal | null, experience: Experience | null, time: TimePerDay | null): string[] {
  const base = goal === "money" ? "монетизация" : goal === "startup" ? "масштабируемый стартап" : goal === "ai" ? "AI-продукт" : "обучение";
  const skill = experience === "beginner" ? "для новичков" : "с использованием твоего опыта";
  const effort = time === "1-2h" ? "в свободное время" : "как основной проект";

  return [
    `Платформа для ${base} ${skill} ${effort} (идея 1)`,
    `AI-инструмент для ${base} с фокусом на ${skill} ${effort} (идея 2)`,
    `Сервис по ${base} для целевой аудитории ${skill} ${effort} (идея 3)`,
  ];
}

export default function OnboardingPage() {
  const router = useRouter();
  const { t, locale: language } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    goal: null,
    experience: null,
    timePerDay: null,
    idea: "",
  });

  // Client-side guard: prevent already-onboarded users from accessing /onboarding directly
  useEffect(() => {
    if (authLoading || !user?.id) return;

    (async () => {
      const completed = await hasCompletedOnboarding(user.id);
      if (completed) {
        router.replace("/dashboard");
      }
    })();
  }, [user?.id, authLoading, router]);

  const canNext =
    (step === 1 && data.goal !== null) ||
    (step === 2 && data.experience !== null) ||
    (step === 3 && data.timePerDay !== null) ||
    step === 4; // idea is optional

  async function handleFinish() {
    setLoading(true);
    try {
      localStorage.setItem("vc_onboarding", JSON.stringify(data));
      setStoredGoal(data.goal || "money");

      if (!getStoredProgress()) {
        setStoredProgress(DEFAULT_PROGRESS);
      }

      if (user) {
        const supabase = createClient();
        // IMPORTANT: Write to the real base table (user_profiles) using the correct column.
        // vc_profiles is a read-only compatibility VIEW. Writing to it does not persist.
        // This ensures onboarding_completed (derived in VIEW) becomes true on next login.
        await supabase.from("user_profiles").upsert(
          {
            user_id: user.id,
            onboarding_data: {
              goal: data.goal,
              experience: data.experience,
              time_per_day: data.timePerDay,
              idea: data.idea || null,
            },
          },
          { onConflict: "user_id" }
        );

        // Generate personalized AI plan
        await generateAndSavePlan(
          user.id,
          {
            goal: data.goal || "money",
            experience: data.experience || "beginner",
            timePerDay: data.timePerDay || "1-2h",
            idea: data.idea || "",
          },
          language
        );
      }
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    }
  }

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
    if (step === 4) {
      // Step 4 → Step 5 (loading/saving)
      setStep(5);
      handleFinish();
    }
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-6"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            {step <= 4 ? `${step}/4` : ""}
          </div>
          <LanguageSwitcher />
        </div>

        {/* Progress bar */}
        {step <= 4 && (
          <div
            className="mb-8 h-1.5 w-full overflow-hidden"
            style={{
              background: "var(--bg-card)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${(step / 4) * 100}%`,
                background: "linear-gradient(90deg, var(--accent), var(--accent-light))",
                borderRadius: "var(--radius-sm)",
              }}
            />
          </div>
        )}

        {/* Logo */}
        <div className="mb-3 text-center">
          <AnimatedLogo size="sm" />
        </div>
        <p
          className="mb-8 text-center text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          {t("onboarding.subtitle")}
        </p>

        {/* Step 1: Goal */}
        {step === 1 && (
          <div>
            <h2 className="mb-5 text-lg font-semibold">
              {t("onboarding.question")}
            </h2>
            <div className="flex flex-col gap-3">
              {GOALS.map(({ id, emoji }) => (
                <button
                  key={id}
                  onClick={() => setData({ ...data, goal: id })}
                  className="flex items-center gap-4 p-4 text-left transition-all duration-200"
                  style={{
                    background:
                      data.goal === id
                        ? "var(--bg-card-hover)"
                        : "var(--bg-card)",
                    border: `1px solid ${
                      data.goal === id ? "var(--accent)" : "var(--border)"
                    }`,
                    borderRadius: "var(--radius-lg)",
                    boxShadow:
                      data.goal === id
                        ? "var(--shadow-glow)"
                        : "var(--shadow-sm)",
                  }}
                >
                  <span className="text-3xl">{emoji}</span>
                  <div>
                    <div className="font-semibold">
                      {t(`onboarding.goal_${id}`)}
                    </div>
                    <div
                      className="text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {t(`onboarding.goal_${id}_desc`)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Experience */}
        {step === 2 && (
          <div>
            <h2 className="mb-5 text-lg font-semibold">
              {t("onboarding.exp_question")}
            </h2>
            <div className="flex flex-col gap-3">
              {EXPERIENCE_LEVELS.map(({ id, emoji }) => (
                <button
                  key={id}
                  onClick={() => setData({ ...data, experience: id })}
                  className="flex items-center gap-4 p-4 text-left transition-all duration-200"
                  style={{
                    background:
                      data.experience === id
                        ? "var(--bg-card-hover)"
                        : "var(--bg-card)",
                    border: `1px solid ${
                      data.experience === id
                        ? "var(--accent)"
                        : "var(--border)"
                    }`,
                    borderRadius: "var(--radius-lg)",
                    boxShadow:
                      data.experience === id
                        ? "var(--shadow-glow)"
                        : "var(--shadow-sm)",
                  }}
                >
                  <span className="text-3xl">{emoji}</span>
                  <div>
                    <div className="font-semibold">
                      {t(`onboarding.exp_${id}`)}
                    </div>
                    <div
                      className="text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {t(`onboarding.exp_${id}_desc`)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Time */}
        {step === 3 && (
          <div>
            <h2 className="mb-5 text-lg font-semibold">
              {t("onboarding.time_question")}
            </h2>
            <div className="flex flex-col gap-3">
              {TIME_OPTIONS.map(({ id, emoji }) => (
                <button
                  key={id}
                  onClick={() => setData({ ...data, timePerDay: id })}
                  className="flex items-center gap-4 p-4 text-left transition-all duration-200"
                  style={{
                    background:
                      data.timePerDay === id
                        ? "var(--bg-card-hover)"
                        : "var(--bg-card)",
                    border: `1px solid ${
                      data.timePerDay === id
                        ? "var(--accent)"
                        : "var(--border)"
                    }`,
                    borderRadius: "var(--radius-lg)",
                    boxShadow:
                      data.timePerDay === id
                        ? "var(--shadow-glow)"
                        : "var(--shadow-sm)",
                  }}
                >
                  <span className="text-3xl">{emoji}</span>
                  <div>
                    <div className="font-semibold">
                      {t(`onboarding.time_${id}`)}
                    </div>
                    <div
                      className="text-sm"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {t(`onboarding.time_${id}_desc`)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Idea */}
        {step === 4 && (
          <div>
            <h2 className="mb-2 text-lg font-semibold">
              {t("onboarding.idea_question")}
            </h2>
            <p
              className="mb-5 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {t("onboarding.idea_hint")}
            </p>
            <textarea
              value={data.idea}
              onChange={(e) => setData({ ...data, idea: e.target.value })}
              placeholder={t("onboarding.idea_placeholder")}
              rows={4}
              className="w-full resize-none p-4 text-sm outline-none transition-all duration-200"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                color: "var(--text)",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--accent)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--border)")
              }
            />
            <button
              onClick={() => {
                // AI-powered idea suggestions based on collected data (goal, experience, time)
                const suggestions = generateIdeaSuggestions(data.goal, data.experience, data.timePerDay);
                // For demo, set the first suggestion or show list
                // In real, could open a modal with 3 options or call /api/ai
                setData({ ...data, idea: suggestions[0] });
                // TODO: Show modal with all 3 suggestions for user to choose
                alert(`Предложенные идеи:\n1. ${suggestions[0]}\n2. ${suggestions[1]}\n3. ${suggestions[2]}\n\n(В продакшене здесь будет красивый выбор или вызов ИИ)`);
              }}
              className="mt-3 text-sm underline hover:text-[var(--accent)] transition-colors"
              style={{ color: "var(--accent-light)" }}
            >
              {t("onboarding.idea_skip")}
            </button>
          </div>
        )}

        {/* Step 5: Loading */}
        {step === 5 && (
          <div className="flex flex-col items-center py-12">
            <div className="mb-6 text-5xl animate-pulse">🧠</div>
            <h2 className="mb-3 text-xl font-bold">
              {t("onboarding.loading_title")}
            </h2>
            <p
              className="text-center text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {t("onboarding.loading_desc")}
            </p>
            <div className="mt-8 flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full animate-bounce"
                  style={{
                    background: "var(--accent)",
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        {step <= 4 && (
          <div className="mt-8 flex gap-3">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex-1 py-3 text-sm font-medium transition-all duration-200"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text)",
                }}
              >
                {t("onboarding.back")}
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canNext}
              className="flex-1 py-3 text-sm font-semibold transition-all duration-200"
              style={{
                background: canNext
                  ? "linear-gradient(135deg, var(--accent), #6d28d9)"
                  : "var(--bg-card)",
                borderRadius: "var(--radius-md)",
                color: canNext ? "#fff" : "var(--text-muted)",
                boxShadow: canNext ? "var(--shadow-glow)" : "none",
                opacity: canNext ? 1 : 0.5,
                cursor: canNext ? "pointer" : "not-allowed",
              }}
            >
              {step === 4
                ? t("onboarding.start_button")
                : t("onboarding.next")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
