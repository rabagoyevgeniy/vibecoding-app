"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { fetchArtifact, saveArtifact } from "@/lib/supabase-storage";

interface ArtifactSection {
  title: string;
  content: string;
}

interface Artifact {
  artifact_title: string;
  sections: ArtifactSection[];
  key_insights: string[];
  action_items: string[];
  confidence_score: number;
  next_day_preview: string;
}

interface DaySummaryProps {
  day: number;
  responses: Record<string, string>;
  onboarding?: {
    goal: string;
    experience: string;
    timePerDay: string;
    idea: string;
  };
  onClose: () => void;
  onOpenWorkspace?: () => void;
}

export function DaySummary({ day, responses, onboarding, onClose, onOpenWorkspace }: DaySummaryProps) {
  const { t, locale } = useI18n();
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    async function loadArtifact() {
      // 1. Try Supabase first if logged in
      if (user?.id) {
        const cloud = await fetchArtifact(user.id, day);
        if (cloud) {
          setArtifact(cloud);
          setLoading(false);
          return;
        }
      }

      // 2. Fallback to localStorage cache
      const cached = localStorage.getItem(`vc_artifact_${day}`);
      if (cached) {
        try {
          setArtifact(JSON.parse(cached));
          setLoading(false);
          return;
        } catch {}
      }

      // 3. Generate new
      try {
        const res = await fetch("/api/ai/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day, responses, onboarding, language: locale }),
        });
        if (!res.ok) throw new Error("Failed");
        const { artifact: data } = await res.json();
        setArtifact(data);
        localStorage.setItem(`vc_artifact_${day}`, JSON.stringify(data));

        // Also save to Supabase if logged in
        if (user?.id) {
          void saveArtifact(user.id, day, data);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    void loadArtifact();
  }, [day, responses, onboarding, locale, user?.id]);

  if (loading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex flex-col items-center gap-4 p-8">
          <div className="text-5xl animate-pulse">🧠</div>
          <h2 className="text-xl font-bold">{t("synthesis.generating") || "AI is analyzing your work..."}</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t("synthesis.generating_desc") || "Creating your personalized business document"}
          </p>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2.5 w-2.5 rounded-full animate-bounce"
                style={{ background: "var(--accent)", animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !artifact) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      >
        <div
          className="w-full max-w-md p-6 text-center"
          style={{
            background: "var(--bg)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="mb-3 text-3xl">⚠️</div>
          <p className="mb-4">{t("synthesis.error") || "Couldn't generate your summary. Try again."}</p>
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--accent)", borderRadius: "var(--radius-md)" }}
          >
            {t("common.close") || "Close"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)" }}
    >
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">🎯</div>
          <h1 className="mb-1 text-2xl font-bold">{artifact.artifact_title}</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t("common.day")} {day} — {t("synthesis.complete") || "Day Complete"}
          </p>
        </div>

        {/* Confidence score */}
        <div
          className="mb-6 flex items-center justify-center gap-3 p-3"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <div className="relative h-12 w-12">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--border)"
                strokeWidth="2.5"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeDasharray={`${artifact.confidence_score}, 100`}
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center text-xs font-bold"
              style={{ color: "var(--accent-light)" }}
            >
              {artifact.confidence_score}
            </span>
          </div>
          <div>
            <div className="text-sm font-semibold">{t("synthesis.confidence") || "AI Confidence Score"}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              {artifact.confidence_score >= 80
                ? t("synthesis.confidence_high") || "Strong foundation"
                : artifact.confidence_score >= 60
                  ? t("synthesis.confidence_medium") || "Good start, needs refinement"
                  : t("synthesis.confidence_low") || "Needs more validation"}
            </div>
          </div>
        </div>

        {/* Key Insights */}
        <div
          className="mb-4 p-4"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(109,40,217,0.1))",
            border: "1px solid var(--accent)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--accent-light)" }}>
            💡 {t("synthesis.key_insights") || "Key Insights"}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {artifact.key_insights.map((insight, i) => (
              <li key={i} className="text-sm" style={{ color: "var(--text)" }}>
                • {insight}
              </li>
            ))}
          </ul>
        </div>

        {/* Sections */}
        <div className="mb-6 flex flex-col gap-3">
          {artifact.sections.map((section, i) => (
            <details
              key={i}
              className="group"
              open={i === 0}
            >
              <summary
                className="flex cursor-pointer items-center justify-between p-4 transition-all duration-200"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <span className="font-semibold">{section.title}</span>
                <span className="text-xs transition-transform group-open:rotate-180" style={{ color: "var(--text-muted)" }}>
                  ▼
                </span>
              </summary>
              <div
                className="mt-1 p-4 text-sm leading-relaxed whitespace-pre-wrap"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
                  color: "var(--text-muted)",
                }}
              >
                {section.content}
              </div>
            </details>
          ))}
        </div>

        {/* Action Items */}
        <div
          className="mb-6 p-4"
          style={{
            background: "rgba(34,197,94,0.1)",
            border: "1px solid var(--success)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--success)" }}>
            ✅ {t("synthesis.actions") || "Action Items for Tomorrow"}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {artifact.action_items.map((item, i) => (
              <li key={i} className="text-sm">
                {i + 1}. {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Next Day Preview */}
        {artifact.next_day_preview && (
          <div
            className="mb-6 p-4"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <h3 className="mb-1 text-sm font-semibold">
              🔮 {t("synthesis.tomorrow") || "Tomorrow's Preview"}
            </h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {artifact.next_day_preview}
            </p>
          </div>
        )}

        {/* Open in Workspace CTA */}
        {onOpenWorkspace && (
          <button
            onClick={onOpenWorkspace}
            className="mb-3 flex w-full items-center justify-center gap-3 p-4 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110"
            style={{
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "0 0 24px rgba(249,115,22,0.3)",
            }}
          >
            ⚡ {t("synthesis.open_workspace") || "Open in AI Workspace"}
          </button>
        )}

        {/* Close / Back to Dashboard */}
        <button
          onClick={onClose}
          className="flex w-full items-center justify-center gap-2 p-3 text-sm font-medium transition-all duration-200"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            color: "var(--text)",
          }}
        >
          ← {t("synthesis.back") || "Back to Mission"}
        </button>
      </div>
    </div>
  );
}
