"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MISSIONS } from "@/lib/missions-data";
import { StepList } from "@/components/StepList";
import { StepModal } from "@/components/StepModal";
import { SideQuests } from "@/components/SideQuests";
import { ProgressBar } from "@/components/ProgressBar";
import { AIMentor } from "@/components/AIMentor";
import { useI18n } from "@/lib/i18n";
import { addLeadsFromStepResponse } from "@/lib/leads";
import { addSkillXP } from "@/lib/skills";
import { getLessonsForDay } from "@/lib/learning-data";

interface ProgressData {
  current_day: number;
  xp: number;
  level: number;
}

export default function MissionPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const day = Number(params.id);
  const mission = MISSIONS.find((m) => m.day === day);

  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [modalStep, setModalStep] = useState<number | null>(null);
  const [isEditingStep, setIsEditingStep] = useState(false);
  const [completedSideQuests, setCompletedSideQuests] = useState<number[]>([]);

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
      const firstIncomplete = mission?.steps.findIndex((_, i) => !parsed.includes(i));
      if (firstIncomplete !== undefined && firstIncomplete >= 0) {
        setActiveStep(firstIncomplete);
      }
    }

    const savedSQ = localStorage.getItem(`vc_sidequests_${day}`);
    if (savedSQ) setCompletedSideQuests(JSON.parse(savedSQ));
  }, [day, router, mission]);

  if (!mission || !progress) return null;

  function handleToggle(index: number) {
    if (completedSteps.includes(index)) {
      // Uncheck — remove from completed (no XP penalty)
      setCompletedSteps((prev) => {
        const next = prev.filter((s) => s !== index);
        localStorage.setItem(`vc_steps_${day}`, JSON.stringify(next));
        return next;
      });
      return;
    }
    // Open modal for incomplete steps
    setIsEditingStep(false);
    setModalStep(index);
  }

  function handleEdit(index: number) {
    // Open modal with saved response pre-filled
    setIsEditingStep(true);
    setModalStep(index);
  }

  function handleSideQuestToggle(index: number) {
    setCompletedSideQuests((prev) => {
      const wasDone = prev.includes(index);
      const next = wasDone ? prev.filter((s) => s !== index) : [...prev, index];
      localStorage.setItem(`vc_sidequests_${day}`, JSON.stringify(next));

      // Award bonus XP + skill XP on completion only
      if (!wasDone && mission) {
        const quest = mission.sideQuests[index];
        addSkillXP(quest.skill);

        const p: ProgressData = JSON.parse(localStorage.getItem("vc_progress")!);
        const updated = { ...p, xp: p.xp + quest.xp, level: Math.floor((p.xp + quest.xp) / 100) + 1 };
        localStorage.setItem("vc_progress", JSON.stringify(updated));
        setProgress(updated);
      }

      return next;
    });
  }

  function completeStep(index: number) {
    setCompletedSteps((prev) => {
      const next = prev.includes(index)
        ? prev.filter((s) => s !== index)
        : [...prev, index];

      localStorage.setItem(`vc_steps_${day}`, JSON.stringify(next));

      // Award XP + skill XP
      if (!prev.includes(index)) {
        addSkillXP(mission!.steps[index].skill);

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

  function handleModalComplete(response: string) {
    if (modalStep === null) return;

    // Save the user's response for this step
    const key = `vc_response_${day}_${modalStep}`;
    localStorage.setItem(key, response);

    // Auto-create leads from "Send to X people" steps
    const stepKey = mission!.steps[modalStep].titleKey;
    if (stepKey === "missions.day4_step4" || stepKey === "missions.day5_step5") {
      addLeadsFromStepResponse(response, day);
    }

    if (isEditingStep) {
      // Editing — just update response, no XP change
      setModalStep(null);
      setIsEditingStep(false);
      return;
    }

    completeStep(modalStep);
    setModalStep(null);

    // Advance active step to next incomplete
    const nextIncomplete = mission!.steps.findIndex(
      (_, i) => i !== modalStep && !completedSteps.includes(i)
    );
    if (nextIncomplete >= 0) setActiveStep(nextIncomplete);
  }

  const currentStepTitle = t(mission.steps[activeStep]?.titleKey || "");
  const currentStepDesc = t(mission.steps[activeStep]?.descKey || "");

  // Gather user responses for AI context
  const userResponses: Record<string, string> = {};
  mission.steps.forEach((step, i) => {
    const saved = localStorage.getItem(`vc_response_${day}_${i}`);
    if (saved) userResponses[t(step.titleKey)] = saved;
  });

  return (
    <div className="mx-auto max-w-lg p-6">
      {/* Back */}
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm transition-colors duration-200"
        style={{ color: "var(--text-muted)" }}
      >
        {t("common.back_dashboard")}
      </Link>

      {/* Mission header */}
      <div className="mb-6">
        <div
          className="mb-2 inline-block px-2.5 py-1 text-xs font-semibold"
          style={{
            background: "var(--accent-glow)",
            color: "var(--accent-light)",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--accent)",
          }}
        >
          {t("common.day")} {mission.day}
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">{t(mission.titleKey)}</h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {t(mission.descKey)}
        </p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <ProgressBar
          value={completedSteps.length}
          max={mission.steps.length}
          label={t("common.steps_completed")}
        />
      </div>

      {/* Completion banner */}
      {completedSteps.length === mission.steps.length && (
        <div
          className="mb-6 p-4 text-center"
          style={{ background: "rgba(34,197,94,0.15)", border: "1px solid var(--success)", borderRadius: "var(--radius-lg)" }}
        >
          <div className="text-lg font-bold" style={{ color: "var(--success)" }}>
            {day === 1 ? t("mission.complete_day1") : t("mission.complete_generic")} 🎉
          </div>
          <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {day === 1
              ? t("mission.complete_day1_desc")
              : t("mission.complete_generic_desc")}
          </div>
        </div>
      )}

      {/* Steps */}
      <h2 className="mb-3 text-lg font-semibold">{t("mission.steps")}</h2>
      <StepList
        steps={mission.steps}
        completedSteps={completedSteps}
        onToggle={handleToggle}
        onEdit={handleEdit}
        onSelectStep={setActiveStep}
        activeStep={activeStep}
      />

      {/* Side Quests */}
      {mission.sideQuests.length > 0 && (
        <SideQuests
          quests={mission.sideQuests}
          completedQuests={completedSideQuests}
          onToggle={handleSideQuestToggle}
        />
      )}

      {/* Related Lessons */}
      {getLessonsForDay(day).length > 0 && (
        <div className="mb-6 mt-6">
          <h3 className="mb-2 text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
            📚 {t("learning.title")}
          </h3>
          <Link
            href="/learning"
            className="flex items-center gap-3 p-3 transition-all duration-200"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div className="flex -space-x-1">
              {getLessonsForDay(day).slice(0, 3).map((lesson) => (
                <span key={lesson.id} className="text-base">{lesson.icon}</span>
              ))}
            </div>
            <span className="flex-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {getLessonsForDay(day).length} {getLessonsForDay(day).length === 1 ? "lesson" : "lessons"} →
            </span>
          </Link>
        </div>
      )}

      {/* Step completion modal */}
      {modalStep !== null && (
        <StepModal
          stepTitle={t(mission.steps[modalStep].titleKey)}
          interaction={mission.steps[modalStep].interaction}
          onComplete={handleModalComplete}
          onCancel={() => { setModalStep(null); setIsEditingStep(false); }}
          initialResponse={isEditingStep ? (localStorage.getItem(`vc_response_${day}_${modalStep}`) || undefined) : undefined}
          isEditing={isEditingStep}
        />
      )}

      {/* AI Mentor */}
      <AIMentor
        missionTitle={t(mission.titleKey)}
        currentStep={currentStepTitle}
        currentStepDesc={currentStepDesc}
        currentDay={day}
        userResponses={userResponses}
        onStepExecuted={() => {
          // When execution mode completes, open the step modal for the active step
          setIsEditingStep(false);
          setModalStep(activeStep);
        }}
      />
    </div>
  );
}
