"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MissionCard } from "@/components/MissionCard";
import { LeadsList } from "@/components/LeadsList";
import { MISSIONS } from "@/lib/missions-data";
import { getLeads, type Lead } from "@/lib/leads";
import { getSkills, type SkillsData } from "@/lib/skills";
import { SkillsCard } from "@/components/SkillsCard";
import { LevelCard } from "@/components/LevelCard";
import { ShareCard } from "@/components/ShareCard";
import { Certificate } from "@/components/Certificate";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getLevelTier } from "@/lib/levels";
import { AnimatedLogo } from "@/components/AnimatedLogo";

interface ProgressData {
  current_day: number;
  xp: number;
  level: number;
}

function getCompletedSteps(day: number): number[] {
  const raw = localStorage.getItem(`vc_steps_${day}`);
  return raw ? JSON.parse(raw) : [];
}

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [skills, setSkills] = useState<SkillsData>({ sales: 0, product: 0, content: 0, ai: 0 });
  const [showShare, setShowShare] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [userName, setUserName] = useState("");

  const refreshLeads = useCallback(() => {
    setLeads(getLeads());
  }, []);

  useEffect(() => {
    const g = localStorage.getItem("vc_goal");
    const p = localStorage.getItem("vc_progress");
    if (!g || !p) {
      router.push("/onboarding");
      return;
    }
    setGoal(g);
    setProgress(JSON.parse(p));
    refreshLeads();
    setSkills(getSkills());
    setUserName(localStorage.getItem("vc_user_name") || "");
  }, [router, refreshLeads]);

  if (!progress || !goal) return null;

  const tier = getLevelTier(progress.xp);
  const goalLabel =
    goal === "money"
      ? t("dashboard.path_money")
      : goal === "startup"
        ? t("dashboard.path_startup")
        : t("dashboard.path_ai");

  return (
    <div className="mx-auto max-w-lg p-6">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <AnimatedLogo size="sm" />
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {goalLabel} {t("dashboard.path_suffix")}
          </p>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { value: progress.current_day, label: t("common.day") },
          { value: progress.xp, label: t("common.xp") },
          { value: `${tier.icon} ${tier.level}`, label: t(tier.nameKey) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-3 text-center"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div className="text-2xl font-bold" style={{ color: "var(--accent-light)" }}>
              {stat.value}
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Level card with progress + share */}
      <div className="mb-8">
        <LevelCard xp={progress.xp} onShare={() => setShowShare(true)} />
      </div>

      {/* Certificate CTA — shows after Day 7 completion */}
      {getCompletedSteps(7).length === MISSIONS[6].steps.length && (
        <div className="mb-8">
          {!userName ? (
            <CertificateNameInput onSubmit={(name) => {
              localStorage.setItem("vc_user_name", name);
              setUserName(name);
            }} />
          ) : (
            <button
              onClick={() => setShowCertificate(true)}
              className="flex w-full items-center gap-3 p-4 transition-all duration-200 hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, #eab308, #f59e0b)",
                border: "1px solid rgba(234,179,8,0.5)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "0 0 24px rgba(234,179,8,0.2)",
              }}
            >
              <span className="text-2xl">🏆</span>
              <div className="text-left">
                <div className="font-semibold text-black">{t("levels.certificate")}</div>
                <div className="text-sm text-black/60">
                  {t("levels.certificate_download")}
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Skills */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">{t("skills.title")}</h2>
        <SkillsCard skills={skills} />
      </div>

      {/* Builder CTA */}
      <Link
        href="/builder"
        className="mb-8 flex items-center gap-3 p-4 transition-all duration-200"
        style={{
          background: "linear-gradient(135deg, var(--accent), #6d28d9)",
          border: "1px solid rgba(124, 58, 237, 0.5)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-glow)",
        }}
      >
        <span className="text-2xl">🛠️</span>
        <div>
          <div className="font-semibold text-white">{t("dashboard.builder")}</div>
          <div className="text-sm text-white/70">
            {t("dashboard.builder_desc")}
          </div>
        </div>
      </Link>

      {/* Learning CTA */}
      <Link
        href="/learning"
        className="mb-8 flex items-center gap-3 p-4 transition-all duration-200"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <span className="text-2xl">📚</span>
        <div>
          <div className="font-semibold" style={{ color: "var(--text)" }}>{t("learning.cta")}</div>
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t("learning.cta_desc")}
          </div>
        </div>
      </Link>

      {/* Leads */}
      {(leads.length > 0 || progress.current_day > 1) && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">{t("leads.title")}</h2>
          <LeadsList leads={leads} onUpdate={refreshLeads} />
        </div>
      )}

      {/* Missions */}
      <h2 className="mb-4 text-lg font-semibold">{t("dashboard.your_missions")}</h2>
      <div className="flex flex-col gap-3">
        {MISSIONS.map((mission) => {
          const completed = getCompletedSteps(mission.day);
          let status: "locked" | "active" | "done";
          if (mission.day < progress.current_day) {
            status = "done";
          } else if (mission.day === progress.current_day) {
            status = "active";
          } else {
            status = "locked";
          }

          return (
            <MissionCard
              key={mission.day}
              day={mission.day}
              title={t(mission.titleKey)}
              description={t(mission.descKey)}
              status={status}
              stepsCompleted={completed.length}
              totalSteps={mission.steps.length}
            />
          );
        })}
      </div>

      {/* Share modal */}
      {showShare && (
        <ShareCard
          xp={progress.xp}
          currentDay={progress.current_day}
          skills={skills}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* Certificate modal */}
      {showCertificate && userName && (
        <Certificate
          userName={userName}
          xp={progress.xp}
          skills={skills}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </div>
  );
}

function CertificateNameInput({ onSubmit }: { onSubmit: (name: string) => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("");

  return (
    <div
      className="p-4"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xl">🏆</span>
        <span className="font-semibold">{t("levels.certificate")}</span>
      </div>
      <div className="mb-3 text-sm" style={{ color: "var(--text-muted)" }}>
        {t("levels.enter_name")}
      </div>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("levels.name_placeholder")}
          className="flex-1 px-3 py-2 text-sm outline-none"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            color: "var(--text)",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onSubmit(name.trim());
          }}
        />
        <button
          onClick={() => name.trim() && onSubmit(name.trim())}
          disabled={!name.trim()}
          className="px-4 py-2 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40"
          style={{
            background: "var(--accent)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {t("levels.generate")}
        </button>
      </div>
    </div>
  );
}
