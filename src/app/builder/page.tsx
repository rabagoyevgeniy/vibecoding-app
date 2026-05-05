"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

interface BuildPlan {
  title: string;
  steps: string[];
  tools: string[];
  prompts: string[];
}

export default function BuilderPage() {
  const { t, locale } = useI18n();
  const [idea, setIdea] = useState("");
  const [plan, setPlan] = useState<BuildPlan | null>(null);
  const [loading, setLoading] = useState(false);

  async function generatePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim() || loading) return;

    setLoading(true);
    setPlan(null);

    const responseLanguage = locale === "ru" ? "Russian" : "English";

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_day: 0,
          current_step: "Builder",
          mission_title: "Custom Build",
          user_message: `The user wants to build: "${idea}"

Generate a build plan as JSON with this exact format:
{
  "title": "Project name",
  "steps": ["Step 1...", "Step 2...", "..."],
  "tools": ["Tool 1", "Tool 2", "..."],
  "prompts": ["AI prompt 1", "AI prompt 2", "..."]
}

Return the title, steps, tools, and prompts in ${responseLanguage}.
Return ONLY valid JSON, no markdown, no explanation.`,
          history: [],
        }),
      });

      const data = await res.json();
      const parsed = JSON.parse(data.response);
      setPlan(parsed);
    } catch {
      setPlan({
        title: idea,
        steps: [t("builder.fallback")],
        tools: [],
        prompts: [],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        {t("common.back_dashboard")}
      </Link>

      <h1 className="mb-2 text-2xl font-bold">
        🛠️ {t("builder.title")}
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
        {t("builder.subtitle")}
      </p>

      <form onSubmit={generatePlan}>
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder={t("builder.placeholder")}
          rows={4}
          className="mb-4 w-full resize-none rounded-xl p-4 text-sm outline-none"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        />
        <button
          type="submit"
          disabled={loading || !idea.trim()}
          className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {loading ? t("builder.generating") : t("builder.generate")}
        </button>
      </form>

      {plan && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold" style={{ color: "var(--accent-light)" }}>
            {plan.title}
          </h2>

          <h3 className="mb-2 font-semibold">{t("builder.steps")}</h3>
          <div className="mb-6 flex flex-col gap-2">
            {plan.steps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg p-3"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {index + 1}
                </span>
                <span className="text-sm">{step}</span>
              </div>
            ))}
          </div>

          {plan.tools.length > 0 && (
            <>
              <h3 className="mb-2 font-semibold">{t("builder.tools")}</h3>
              <div className="mb-6 flex flex-wrap gap-2">
                {plan.tools.map((tool, index) => (
                  <span
                    key={index}
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: "var(--bg-card-hover)", color: "var(--accent-light)" }}
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </>
          )}

          {plan.prompts.length > 0 && (
            <>
              <h3 className="mb-2 font-semibold">{t("builder.prompts")}</h3>
              <div className="flex flex-col gap-2">
                {plan.prompts.map((prompt, index) => (
                  <div
                    key={index}
                    className="rounded-lg p-3 text-sm italic"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    &quot;{prompt}&quot;
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
