"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MissionCard } from "@/components/MissionCard";
import { ProgressBar } from "@/components/ProgressBar";
import { MISSIONS } from "@/lib/missions-data";

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
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [goal, setGoal] = useState<string | null>(null);

  useEffect(() => {
    const g = localStorage.getItem("vc_goal");
    const p = localStorage.getItem("vc_progress");
    if (!g || !p) {
      router.push("/onboarding");
      return;
    }
    setGoal(g);
    setProgress(JSON.parse(p));
  }, [router]);

  if (!progress || !goal) return null;

  const xpForNextLevel = progress.level * 100;
  const goalLabel =
    goal === "money" ? "💰 Make Money" : goal === "startup" ? "🚀 Startup" : "🤖 AI Master";

  return (
    <div className="mx-auto max-w-lg p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Vibe<span style={{ color: "var(--accent)" }}>Coding</span>
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          {goalLabel} path
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="text-2xl font-bold" style={{ color: "var(--accent-light)" }}>
            {progress.current_day}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            Day
          </div>
        </div>
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="text-2xl font-bold" style={{ color: "var(--accent-light)" }}>
            {progress.xp}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            XP
          </div>
        </div>
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="text-2xl font-bold" style={{ color: "var(--accent-light)" }}>
            {progress.level}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            Level
          </div>
        </div>
      </div>

      {/* XP bar */}
      <div className="mb-8">
        <ProgressBar value={progress.xp % 100} max={xpForNextLevel} label="XP to next level" />
      </div>

      {/* Builder CTA */}
      <Link
        href="/builder"
        className="mb-8 flex items-center gap-3 rounded-xl p-4 transition-all"
        style={{
          background: "linear-gradient(135deg, var(--accent), #6d28d9)",
          border: "1px solid var(--accent)",
        }}
      >
        <span className="text-2xl">🛠️</span>
        <div>
          <div className="font-semibold text-white">Builder</div>
          <div className="text-sm text-white/70">
            Got an idea? Get a step-by-step build plan from AI
          </div>
        </div>
      </Link>

      {/* Missions */}
      <h2 className="mb-4 text-lg font-semibold">Your Missions</h2>
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
              title={mission.title}
              description={mission.description}
              status={status}
              stepsCompleted={completed.length}
              totalSteps={mission.steps.length}
            />
          );
        })}
      </div>
    </div>
  );
}
