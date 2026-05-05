"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SkillsCard } from "@/components/SkillsCard";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { getLevelTier } from "@/lib/levels";
import { getUserProfile } from "@/lib/plan-engine";
import {
  ensureStoredProgress,
  getStoredGoal,
  setStoredGoal,
  type ProgressData,
} from "@/lib/progress";
import { getSkills, type SkillsData } from "@/lib/skills";

const EMPTY_SKILLS: SkillsData = {
  sales: 0,
  product: 0,
  content: 0,
  ai: 0,
};

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, loading, signOut } = useAuth();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [skills, setSkills] = useState<SkillsData>(EMPTY_SKILLS);
  const [goal, setGoal] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (loading) return;

    let cancelled = false;

    async function loadProfile() {
      const storedProgress = ensureStoredProgress();
      const storedGoal = getStoredGoal();

      if (cancelled) return;

      setProgress(storedProgress);
      setSkills(getSkills());

      if (storedGoal) {
        setGoal(storedGoal);
        return;
      }

      if (user) {
        const profile = await getUserProfile(user.id);
        const goalFromProfile = profile?.onboarding_answers?.goal || "money";

        if (cancelled) return;

        setStoredGoal(goalFromProfile);
        setGoal(goalFromProfile);
        return;
      }

      setGoal("money");
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    router.push("/auth");
  }

  if (loading || !progress || !goal) return null;

  const tier = getLevelTier(progress.xp);
  const goalLabel =
    goal === "money"
      ? t("dashboard.path_money")
      : goal === "startup"
        ? t("dashboard.path_startup")
        : goal === "ai"
          ? t("dashboard.path_ai")
          : t("dashboard.path_learn");

  return (
    <div className="mx-auto max-w-lg p-6">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <AnimatedLogo size="sm" />
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {t("profile.subtitle")}
          </p>
        </div>
        <LanguageSwitcher />
      </div>

      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm transition-colors duration-200"
        style={{ color: "var(--text-muted)" }}
      >
        {t("common.back_dashboard")}
      </Link>

      <h1 className="mb-6 text-2xl font-bold">{t("profile.title")}</h1>

      <div
        className="mb-6 p-4"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div className="mb-1 text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>
          {t("profile.email")}
        </div>
        <div className="text-sm font-medium">{user?.email || ""}</div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        {[
          { label: t("common.day"), value: progress.current_day },
          { label: t("common.xp"), value: progress.xp },
          { label: t("common.level"), value: `${tier.icon} ${tier.level}` },
          { label: t("profile.current_path"), value: goalLabel },
        ].map((item) => (
          <div
            key={item.label}
            className="p-4"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div className="mb-1 text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>
              {item.label}
            </div>
            <div className="text-sm font-semibold">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">{t("skills.title")}</h2>
        <SkillsCard skills={skills} />
      </div>

      <button
        onClick={() => void handleSignOut()}
        disabled={isSigningOut}
        className="w-full rounded-xl py-3 font-semibold text-white transition-all duration-200 disabled:opacity-60"
        style={{
          background: "linear-gradient(135deg, #ef4444, #dc2626)",
          boxShadow: "0 0 20px rgba(239,68,68,0.18)",
        }}
      >
        {isSigningOut ? t("profile.signing_out") : t("profile.sign_out")}
      </button>
    </div>
  );
}
