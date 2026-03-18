"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GOALS = [
  {
    id: "money" as const,
    emoji: "💰",
    title: "Make Money",
    description: "Build products that generate revenue fast",
  },
  {
    id: "startup" as const,
    emoji: "🚀",
    title: "Launch a Startup",
    description: "Build and ship a real SaaS or product",
  },
  {
    id: "ai" as const,
    emoji: "🤖",
    title: "Master AI Tools",
    description: "Learn to build with AI as your co-pilot",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<"money" | "startup" | "ai" | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    if (!selected) return;
    setLoading(true);

    // Store goal in localStorage for MVP (Supabase auth later)
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
        <h1 className="mb-2 text-center text-4xl font-bold tracking-tight">
          Vibe<span style={{ color: "var(--accent)" }}>Coding</span>
        </h1>
        <p className="mb-10 text-center" style={{ color: "var(--text-muted)" }}>
          Build real products in 7 days. AI-guided, step by step.
        </p>

        <h2 className="mb-4 text-lg font-semibold">What&apos;s your goal?</h2>

        <div className="flex flex-col gap-3">
          {GOALS.map((goal) => (
            <button
              key={goal.id}
              onClick={() => setSelected(goal.id)}
              className="flex items-center gap-4 rounded-xl p-4 text-left transition-all"
              style={{
                background:
                  selected === goal.id ? "var(--bg-card-hover)" : "var(--bg-card)",
                border: `1px solid ${selected === goal.id ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              <span className="text-3xl">{goal.emoji}</span>
              <div>
                <div className="font-semibold">{goal.title}</div>
                <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {goal.description}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleStart}
          disabled={!selected || loading}
          className="mt-8 w-full rounded-xl py-3 text-lg font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: "var(--accent)" }}
        >
          {loading ? "Setting up..." : "Start Building →"}
        </button>
      </div>
    </div>
  );
}
