"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AnimatedLogo } from "@/components/AnimatedLogo";

const GOAL_IDS = ["money", "startup", "ai"] as const;
const GOAL_EMOJIS = { money: "💰", startup: "🚀", ai: "🤖" };

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [selected, setSelected] = useState<"money" | "startup" | "ai" | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    if (!selected) return;
    setLoading(true);
    localStorage.setItem("vc_goal", selected);
    localStorage.setItem(
      "vc_progress",
      JSON.stringify({ current_day: 1, xp: 0, level: 1 })
    );
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-end">
          <LanguageSwitcher />
        </div>

        <div className="mb-3 text-center">
          <AnimatedLogo size="sm" />
        </div>
        <p className="mb-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {t("onboarding.subtitle")}
        </p>

        <h2 className="mb-5 text-lg font-semibold">{t("onboarding.question")}</h2>

        <div className="flex flex-col gap-3">
          {GOAL_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className="flex items-center gap-4 p-4 text-left transition-all duration-200"
              style={{
                background: selected === id ? "var(--bg-card-hover)" : "var(--bg-card)",
                border: `1px solid ${selected === id ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "var(--radius-lg)",
                boxShadow: selected === id ? "var(--shadow-glow)" : "var(--shadow-sm)",
              }}
            >
              <span className="text-3xl">{GOAL_EMOJIS[id]}</span>
              <div>
                <div className="font-semibold">{t(`onboarding.goal_${id}`)}</div>
                <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {t(`onboarding.goal_${id}_desc`)}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleStart}
          disabled={!selected || loading}
          className="mt-8 w-full py-3.5 text-lg font-semibold text-white transition-all duration-200 disabled:opacity-40"
          style={{
            background: "var(--accent)",
            borderRadius: "var(--radius-lg)",
            boxShadow: selected ? "var(--shadow-glow)" : "none",
          }}
        >
          {loading ? t("onboarding.loading") : t("onboarding.start_button")}
        </button>
      </div>
    </div>
  );
}
