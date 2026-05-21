"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MISSIONS, type Mission } from "@/lib/missions-data";
import { StepList } from "@/components/StepList";
import { StepModal } from "@/components/StepModal";
import { SideQuests } from "@/components/SideQuests";
import { ProgressBar } from "@/components/ProgressBar";
import { AIMentor } from "@/components/AIMentor";
import { useI18n } from "@/lib/i18n";
import { addLeadsFromStepResponse } from "@/lib/leads";
import { addSkillXP } from "@/lib/skills";
import { getLessonsForDay } from "@/lib/learning-data";
import { DaySummary } from "@/components/DaySummary";
import { useAuth } from "@/lib/auth";
import {
  getAllPlanDays,
  markPlanDayCompleted,
  syncPlanDayStatuses,
  type StoredPlanDay,
} from "@/lib/plan-engine";
import {
  DEFAULT_PROGRESS,
  addXpToCloud,
  getCompletedSteps as getStoredCompletedSteps,
  getStoredProgress,
  initializeProgressFromPlanDays,
  mergeProgress,
  setStoredProgress,
  type ProgressData,
} from "@/lib/progress";
import {
  saveStepResponse,
  fetchDayResponses,
  markStepCompleted,
  fetchCompletedStepsForDay,
  fetchSideQuestsForDay,
} from "@/lib/supabase-storage";

function mapPlanDayToMission(
  planDay: StoredPlanDay,
  fallbackMission?: Mission
): Mission {
  return {
    day: planDay.day,
    titleKey: planDay.title,
    descKey: planDay.description,
    steps: planDay.steps.map((step) => ({
      titleKey: step.title,
      descKey: step.description,
      skill: step.skill,
      xp: step.xp,
      interaction: {
        type: step.type,
        promptKey: step.description || step.title,
        placeholderKey:
          step.type === "input" ? "step_modal.input_placeholder" : undefined,
      },
    })),
    sideQuests: fallbackMission?.sideQuests ?? [],
  };
}

function getStoredSideQuests(day: number): number[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(`vc_sidequests_${day}`);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((quest): quest is number => Number.isInteger(quest))
      : [];
  } catch {
    return [];
  }
}

export default function MissionPage() {
  const params = useParams();
  const router = useRouter();
  const { t, locale } = useI18n();
  const { user, loading } = useAuth();
  const day = Number(params.id);

  const [mission, setMission] = useState<Mission | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [modalStep, setModalStep] = useState<number | null>(null);
  const [isEditingStep, setIsEditingStep] = useState(false);
  const [completedSideQuests, setCompletedSideQuests] = useState<number[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [hasDynamicPlan, setHasDynamicPlan] = useState(false);
  const [dayStatus, setDayStatus] = useState<StoredPlanDay["status"] | null>(null);

  // Hybrid responses (Supabase first + localStorage fallback)
  const [dayResponsesMap, setDayResponsesMap] = useState<Record<number, string>>({});

  const NEXUS_WORKSPACE_URL = "https://ai.studio/apps/79c5a5dc-f3b8-4212-901d-eb9564ec6391";

  useEffect(() => {
    if (!Number.isFinite(day) || day < 1 || day > 7) {
      router.push("/dashboard");
      return;
    }

    if (loading) return;

    let cancelled = false;

    async function loadMissionData() {
      const fallbackMission = MISSIONS.find((item) => item.day === day);
      let resolvedMission = fallbackMission ?? null;
      let resolvedHasDynamicPlan = false;
      let resolvedDayStatus: StoredPlanDay["status"] | null = null;
      let inferredProgress = DEFAULT_PROGRESS;

      if (user) {
        const rawPlanDays = await getAllPlanDays(user.id);

        if (rawPlanDays.length > 0) {
          const syncedPlanDays = await syncPlanDayStatuses(user.id, rawPlanDays);
          const matchedDay = syncedPlanDays.find((item) => item.day === day);

          if (matchedDay) {
            resolvedMission = mapPlanDayToMission(matchedDay, fallbackMission);
            resolvedHasDynamicPlan = true;
            resolvedDayStatus = matchedDay.status;
          }

          inferredProgress = initializeProgressFromPlanDays(syncedPlanDays);
        }
      }

      if (!resolvedMission) {
        router.push("/dashboard");
        return;
      }

      const storedProgress = mergeProgress(getStoredProgress(), inferredProgress);
      setStoredProgress(storedProgress);

      const savedSteps = getStoredCompletedSteps(day);
      const savedSideQuests = getStoredSideQuests(day);

      // Hybrid load for completions
      if (user?.id) {
        try {
          const [cloudSteps, cloudSide] = await Promise.all([
            fetchCompletedStepsForDay(user.id, day),
            fetchSideQuestsForDay(user.id, day),
          ]);
          // merge (union)
          cloudSteps.forEach((s) => { if (!savedSteps.includes(s)) savedSteps.push(s); });
          cloudSide.forEach((s) => { if (!savedSideQuests.includes(s)) savedSideQuests.push(s); });
        } catch (e) {
          console.error("Failed hybrid load completions", e);
        }
      }

      const firstIncomplete = resolvedMission.steps.findIndex(
        (_, index) => !savedSteps.includes(index)
      );

      if (cancelled) return;

      setMission(resolvedMission);
      setHasDynamicPlan(resolvedHasDynamicPlan);
      setDayStatus(resolvedDayStatus);
      setProgress(storedProgress);
      setCompletedSteps(savedSteps);
      setCompletedSideQuests(savedSideQuests);
      setActiveStep(
        firstIncomplete >= 0
          ? firstIncomplete
          : Math.max(resolvedMission.steps.length - 1, 0)
      );
    }

    void loadMissionData();

    return () => {
      cancelled = true;
    };
  }, [day, user, loading, router]);

  // Hybrid load of step responses: Supabase (if logged in) + localStorage fallback
  useEffect(() => {
    if (!mission || loading) return;

    const currentMission = mission; // capture for the async closure

    async function loadHybridResponses() {
      let responses: Record<number, string> = {};

      if (user?.id) {
        try {
          const fromDb = await fetchDayResponses(user.id, day);
          if (fromDb && Object.keys(fromDb).length > 0) {
            responses = { ...fromDb };
          }
        } catch (err) {
          console.error("[mission] Failed to load responses from Supabase, falling back to local", err);
        }
      }

      // Always merge localStorage (newer local edits win, or fill gaps)
      currentMission.steps.forEach((_, index) => {
        if (!responses[index]) {
          const local = typeof window !== "undefined"
            ? localStorage.getItem(`vc_response_${day}_${index}`)
            : null;
          if (local) {
            responses[index] = local;
          }
        }
      });

      setDayResponsesMap(responses);
    }

    void loadHybridResponses();
  }, [user, day, mission, loading]);

  if (loading || !mission || !progress) return null;

  async function syncDynamicDayCompletion() {
    if (!user || !hasDynamicPlan || dayStatus === "completed") return;

    await markPlanDayCompleted(user.id, day);
    setDayStatus("completed");
  }

  function handleToggle(index: number) {
    if (completedSteps.includes(index)) {
      setCompletedSteps((prev) => {
        const next = prev.filter((stepIndex) => stepIndex !== index);
        localStorage.setItem(`vc_steps_${day}`, JSON.stringify(next));
        return next;
      });
      return;
    }

    setIsEditingStep(false);
    setModalStep(index);
  }

  function handleEdit(index: number) {
    setIsEditingStep(true);
    setModalStep(index);
  }

  function handleSideQuestToggle(index: number) {
    const currentMission = mission;
    if (!currentMission) return;

    setCompletedSideQuests((prev) => {
      const wasDone = prev.includes(index);
      const next = wasDone ? prev.filter((questIndex) => questIndex !== index) : [...prev, index];
      localStorage.setItem(`vc_sidequests_${day}`, JSON.stringify(next));

      if (user?.id) {
        void markStepCompleted(user.id, day, index, true);
      }

      if (!wasDone) {
        const quest = currentMission.sideQuests[index];
        addSkillXP(quest.skill);

        const storedProgress = getStoredProgress() || progress || DEFAULT_PROGRESS;
        const newXp = storedProgress.xp + quest.xp;
        const updated = {
          ...storedProgress,
          xp: newXp,
          level: Math.floor(newXp / 100) + 1,
        };

        setStoredProgress(updated);
        setProgress(updated);

        // Hybrid: push side-quest XP to Supabase
        if (user?.id) {
          void addXpToCloud(user.id, quest.xp);
        }
      }

      return next;
    });
  }

  function completeStep(index: number) {
    const currentMission = mission;
    if (!currentMission) return;

    setCompletedSteps((prev) => {
      const next = prev.includes(index)
        ? prev.filter((stepIndex) => stepIndex !== index)
        : [...prev, index];

      localStorage.setItem(`vc_steps_${day}`, JSON.stringify(next));

      if (user?.id) {
        void markStepCompleted(user.id, day, index, false);
      }

      if (!prev.includes(index)) {
        addSkillXP(currentMission.steps[index].skill);

        const storedProgress = getStoredProgress() || progress || DEFAULT_PROGRESS;
        const stepXp = currentMission.steps[index].xp ?? 20;
        let newXp = storedProgress.xp + stepXp;

        const updated: ProgressData = {
          ...storedProgress,
          xp: newXp,
          level: Math.floor(newXp / 100) + 1,
        };

        const justCompletedDay = next.length === currentMission.steps.length;

        if (justCompletedDay) {
          if (storedProgress.current_day === day) {
            newXp += 50;
            updated.current_day = Math.min(day + 1, 7);
            updated.xp = newXp;
            updated.level = Math.floor(newXp / 100) + 1;
          }

          void syncDynamicDayCompletion();
        }

        setStoredProgress(updated);
        setProgress(updated);

        // Hybrid: push the awarded XP (step + optional day bonus) to Supabase cloud
        if (user?.id) {
          const delta = justCompletedDay ? stepXp + 50 : stepXp;
          void addXpToCloud(user.id, delta);
        }
      }

      return next;
    });
  }

  function handleModalComplete(response: string) {
    if (modalStep === null) return;
    const currentMission = mission;
    if (!currentMission) return;

    const responseKey = `vc_response_${day}_${modalStep}`;
    localStorage.setItem(responseKey, response);

    // Hybrid Supabase save (primary for logged-in users)
    if (user?.id) {
      void saveStepResponse(user.id, day, modalStep, response);
    }

    // Update in-memory map so UI (DaySummary, AIMentor, re-edits) sees it immediately
    setDayResponsesMap((prev) => ({ ...prev, [modalStep]: response }));

    const stepKey = currentMission.steps[modalStep].titleKey;
    if (stepKey === "missions.day4_step4" || stepKey === "missions.day5_step5") {
      addLeadsFromStepResponse(response, day);
    }

    if (isEditingStep) {
      setModalStep(null);
      setIsEditingStep(false);
      return;
    }

    completeStep(modalStep);
    setModalStep(null);

    const nextIncomplete = currentMission.steps.findIndex(
      (_, index) => index !== modalStep && !completedSteps.includes(index)
    );
    if (nextIncomplete >= 0) {
      setActiveStep(nextIncomplete);
    }
  }

  const currentStepTitle = t(mission.steps[activeStep]?.titleKey || "");
  const currentStepDesc = t(mission.steps[activeStep]?.descKey || "");
  const relatedLessons = getLessonsForDay(day);
  const lessonsLabel =
    locale === "ru"
      ? getRussianLessonLabel(relatedLessons.length, t)
      : relatedLessons.length === 1
        ? t("learning.lesson_one")
        : t("learning.lesson_other");

  const userResponses: Record<string, string> = {};
  mission.steps.forEach((step, index) => {
    const saved = dayResponsesMap[index];
    if (saved) {
      userResponses[t(step.titleKey)] = saved;
    }
  });

  return (
    <div className="mx-auto max-w-lg p-6">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm transition-colors duration-200"
        style={{ color: "var(--text-muted)" }}
      >
        {t("common.back_dashboard")}
      </Link>

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

      <div className="mb-6">
        <ProgressBar
          value={completedSteps.length}
          max={mission.steps.length}
          label={t("common.steps_completed")}
        />
      </div>

      {completedSteps.length === mission.steps.length && (
        <div className="mb-6 flex flex-col gap-3">
          <div
            className="p-4 text-center"
            style={{
              background: "rgba(34,197,94,0.15)",
              border: "1px solid var(--success)",
              borderRadius: "var(--radius-lg)",
            }}
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

          <button
            onClick={() => setShowSummary(true)}
            className="flex w-full items-center justify-center gap-3 p-4 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110"
            style={{
              background: "linear-gradient(135deg, var(--accent), #6d28d9)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            🧠 {t("synthesis.view_artifact")}
          </button>

          <a
            href={NEXUS_WORKSPACE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-3 p-4 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110"
            style={{
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "0 0 20px rgba(249,115,22,0.25)",
            }}
          >
            ⚡ {t("synthesis.open_workspace")}
          </a>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">{t("mission.steps")}</h2>
      <StepList
        steps={mission.steps}
        completedSteps={completedSteps}
        onToggle={handleToggle}
        onEdit={handleEdit}
        onSelectStep={setActiveStep}
        activeStep={activeStep}
      />

      {mission.sideQuests.length > 0 && (
        <SideQuests
          quests={mission.sideQuests}
          completedQuests={completedSideQuests}
          onToggle={handleSideQuestToggle}
        />
      )}

      {relatedLessons.length > 0 && (
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
              {relatedLessons.slice(0, 3).map((lesson) => (
                <span key={lesson.id} className="text-base">{lesson.icon}</span>
              ))}
            </div>
            <span className="flex-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {relatedLessons.length} {lessonsLabel} →
            </span>
          </Link>
        </div>
      )}

      {modalStep !== null && (
        <StepModal
          stepTitle={t(mission.steps[modalStep].titleKey)}
          interaction={mission.steps[modalStep].interaction}
          onComplete={handleModalComplete}
          onCancel={() => {
            setModalStep(null);
            setIsEditingStep(false);
          }}
          initialResponse={
            isEditingStep
              ? dayResponsesMap[modalStep]
              : undefined
          }
          isEditing={isEditingStep}
        />
      )}

      <AIMentor
        missionTitle={t(mission.titleKey)}
        currentStep={currentStepTitle}
        currentStepDesc={currentStepDesc}
        currentDay={day}
        userResponses={userResponses}
        onStepExecuted={() => {
          setIsEditingStep(false);
          setModalStep(activeStep);
        }}
      />

      {showSummary && (
        <DaySummary
          day={day}
          responses={userResponses}
          onboarding={(() => {
            try {
              const raw = localStorage.getItem("vc_onboarding");
              if (raw) {
                const parsed = JSON.parse(raw);
                return {
                  goal: parsed.goal || "",
                  experience: parsed.experience || "",
                  timePerDay: parsed.timePerDay || "",
                  idea: parsed.idea || "",
                };
              }
            } catch {
              return undefined;
            }

            return undefined;
          })()}
          onClose={() => setShowSummary(false)}
          onOpenWorkspace={() => {
            window.open(NEXUS_WORKSPACE_URL, "_blank");
          }}
        />
      )}
    </div>
  );
}

function getRussianLessonLabel(
  count: number,
  t: (key: string) => string
): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return t("learning.lesson_one");
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return t("learning.lesson_few");
  }

  return t("learning.lesson_many");
}
