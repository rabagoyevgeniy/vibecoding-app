"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MISSIONS } from "@/lib/missions-data";
import { StepList } from "@/components/StepList";
import { ProgressBar } from "@/components/ProgressBar";
import { AIMentor } from "@/components/AIMentor";

interface ProgressData {
  current_day: number;
  xp: number;
  level: number;
}

export default function MissionPage() {
  const params = useParams();
  const router = useRouter();
  const day = Number(params.id);
  const mission = MISSIONS.find((m) => m.day === day);

  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    const p = localStorage.getItem("vc_progress");
    if (!p) {
      router.push("/onboarding");
      return;
    }
    setProgress(JSON.parse(p));

    const saved = localStorage.getItem(`vc_steps_${day}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setCompletedSteps(parsed);
      // Set active step to first incomplete
      const firstIncomplete = mission?.steps.findIndex((_, i) => !parsed.includes(i));
      if (firstIncomplete !== undefined && firstIncomplete >= 0) {
        setActiveStep(firstIncomplete);
      }
    }
  }, [day, router, mission]);

  if (!mission || !progress) return null;

  function toggleStep(index: number) {
    setCompletedSteps((prev) => {
      const next = prev.includes(index)
        ? prev.filter((s) => s !== index)
        : [...prev, index];

      localStorage.setItem(`vc_steps_${day}`, JSON.stringify(next));

      // Award XP
      if (!prev.includes(index)) {
        const p: ProgressData = JSON.parse(localStorage.getItem("vc_progress")!);
        const newXp = p.xp + 20;
        const newLevel = Math.floor(newXp / 100) + 1;
        const updated = { ...p, xp: newXp, level: newLevel };

        // If all steps done, advance day
        if (next.length === mission!.steps.length && p.current_day === day) {
          updated.current_day = Math.min(day + 1, 7);
          updated.xp += 50; // bonus XP for completing mission
        }

        localStorage.setItem("vc_progress", JSON.stringify(updated));
        setProgress(updated);
      }

      return next;
    });
  }

  const currentStepTitle = mission.steps[activeStep]?.title || "";

  return (
    <div className="mx-auto max-w-lg p-6">
      {/* Back */}
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        ← Dashboard
      </Link>

      {/* Mission header */}
      <div className="mb-6">
        <div className="mb-1 text-sm font-medium" style={{ color: "var(--accent-light)" }}>
          Day {mission.day}
        </div>
        <h1 className="mb-2 text-2xl font-bold">{mission.title}</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {mission.description}
        </p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <ProgressBar
          value={completedSteps.length}
          max={mission.steps.length}
          label="Steps completed"
        />
      </div>

      {/* Completion banner */}
      {completedSteps.length === mission.steps.length && (
        <div
          className="mb-6 rounded-xl p-4 text-center"
          style={{ background: "rgba(34,197,94,0.15)", border: "1px solid var(--success)" }}
        >
          <div className="text-lg font-bold" style={{ color: "var(--success)" }}>
            Mission Complete! 🎉
          </div>
          <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            +50 XP bonus · Next mission unlocked
          </div>
        </div>
      )}

      {/* Steps */}
      <h2 className="mb-3 text-lg font-semibold">Steps</h2>
      <StepList
        steps={mission.steps}
        completedSteps={completedSteps}
        onToggle={toggleStep}
        onSelectStep={setActiveStep}
        activeStep={activeStep}
      />

      {/* AI Mentor */}
      <AIMentor
        missionTitle={mission.title}
        currentStep={currentStepTitle}
        currentDay={day}
      />
    </div>
  );
}
