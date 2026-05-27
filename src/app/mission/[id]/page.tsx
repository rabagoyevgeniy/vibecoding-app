"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MISSIONS, type Mission } from "@/lib/missions-data";
import { StepList } from "@/components/StepList";
import { StepModal } from "@/components/StepModal";
import { SideQuests } from "@/components/SideQuests";
import { ProgressBar } from "@/components/ProgressBar";
import { AIMentor } from "@/components/AIMentor";
import { ArtifactPreviewModal } from "@/components/ArtifactPreviewModal";
import { SqlPreviewModal } from "@/components/SqlPreviewModal";
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
import { useMissionNexus } from "@/lib/nexus/useMissionNexus";
import { SmartQuestCard, type SmartQuest } from "@/components/quests/SmartQuestCard";
import { verifyQuest } from "@/actions/verifyQuest";
import { toast } from "sonner";

// Превью нового ядра продукта: Smart Quests заменяют статичные шаги.
// Эти данные временно захардкожены, пока не подключим выборку из таблицы `smart_quests` (Supabase).
const SMART_QUESTS_PREVIEW: SmartQuest[] = [
  {
    id: "preview-ai-auto",
    title: "AI-команда поднимает Next.js + Supabase для школы плавания",
    description:
      "Техническая команда сама создаст репозиторий, развернёт фронт и базу. От тебя — только финальное одобрение.",
    execution_type: "ai_auto",
    status: "running",
  },
  {
    id: "preview-user-action",
    title: "Подключи Stripe для приёма оплат за абонементы",
    description:
      "Зайди в dashboard.stripe.com → Developers → API keys и вставь сюда secret key. AI проверит ключ и завершит шаг.",
    execution_type: "user_action",
    input_label: "Stripe Secret Key",
    input_placeholder: "sk_live_...",
  },
  {
    id: "preview-vision",
    title: "Не понимаешь, где в Supabase включить RLS?",
    description:
      "Сделай скриншот того, что ты видишь сейчас — AI-наставник укажет стрелкой, куда нажать.",
    execution_type: "ai_vision_help",
  },
];

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

  // Workspace Artifact Previews (independent of AIMentor collapse)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSql, setPreviewSql] = useState<string | null>(null);
  const [isSqlPreviewOpen, setIsSqlPreviewOpen] = useState(false);

  // Smart Quests (preview): локальное состояние "завершён", чтобы карточка визуально
  // переключалась в зелёный success-режим сразу после успешной проверки AI-командой.
  const [completedQuestIds, setCompletedQuestIds] = useState<Set<string>>(
    () => new Set<string>()
  );

  const handleQuestUserSubmit = useCallback(
    async (questId: string, value: string) => {
      // Оптимистичный toast «AI проверяет...» с автоматическим обновлением до success/error.
      const toastId = toast.loading("AI-команда проверяет ввод...");

      try {
        const result = await verifyQuest(questId, value);

        if (result.success) {
          toast.success(result.message, {
            id: toastId,
            description: "Шаг отмечен как завершённый.",
            duration: 4500,
          });
          setCompletedQuestIds((prev) => {
            const next = new Set(prev);
            next.add(questId);
            return next;
          });
        } else {
          toast.error(result.error, {
            id: toastId,
            description: "Попробуй ещё раз. AI ждёт корректный формат.",
            duration: 5000,
          });
          // Пробрасываем, чтобы SmartQuestCard остался в не-success состоянии.
          throw new Error(result.error);
        }
      } catch (err) {
        // Сетевые ошибки и проч. (verifyQuest уже сам кидает на бизнес-ошибках выше).
        if (!(err instanceof Error) || !err.message) {
          toast.error("Не удалось связаться с AI-командой.", { id: toastId });
        }
        throw err;
      }
    },
    []
  );

  const handleQuestScreenshotUpload = useCallback(
    (questId: string, file: File) => {
      toast("Скриншот отправлен AI-наставнику", {
        description: `${file.name} • ${Math.round(file.size / 1024)} KB`,
        icon: "🔍",
      });
      if (process.env.NODE_ENV !== "production") {
        console.info("[SmartQuest] ai_vision_help upload", questId, file.name);
      }
    },
    []
  );

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

  // Nexus v2.0 — encapsulated in custom hook (clean separation of concerns)
  const {
    nexusActions,
    isGeneratingPlan,
    handleGenerateNexusPlan,
    handleNexusExecute,
    handleNexusApprove,
  } = useMissionNexus(user?.id, day);

  // Focus Mode: hide mission steps when AI agent is active (gives 100% attention to the terminal)
  const [showMissionSteps, setShowMissionSteps] = useState(true);
  const isAgentActive = (nexusActions && nexusActions.length > 0) || isGeneratingPlan;

  // Auto-collapse steps when agent becomes active (better focus on reasoning log)
  useEffect(() => {
    if (isAgentActive) {
      setShowMissionSteps(false);
    }
  }, [isAgentActive]);

  // === Workspace Artifact Helpers (independent of AIMentor) ===
  const openArtifactPreview = (html: string) => {
    setPreviewHtml(html);
    setIsPreviewOpen(true);
  };

  const openSqlPreview = (sql: string) => {
    setPreviewSql(sql);
    setIsSqlPreviewOpen(true);
  };

  // Completed artifacts from Nexus (persisted across page visits)
  const completedArtifacts = useMemo(() => {
    if (!nexusActions || nexusActions.length === 0) return [];

    return nexusActions
      .filter((action) => action.status === 'completed' && (action.result?.html || action.result?.sql))
      .map((action) => ({
        id: action.id,
        toolName: action.toolName,
        result: action.result || {},
        projectName: action.result?.project || (action.input as any)?.project_name || null,
      }));
  }, [nexusActions]);

  const userResponses = useMemo(() => {
    // Safety: if mission not loaded yet, return empty object (prevents crash in downstream components)
    if (!mission || !mission.steps) return {};
    const responses: Record<string, string> = {};
    mission.steps.forEach((step, index) => {
      const saved = dayResponsesMap[index];
      if (saved) {
        responses[t(step.titleKey)] = saved;
      }
    });
    return responses;
  }, [mission?.steps, dayResponsesMap, t]);

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

  return (
    <div className="mx-auto max-w-3xl px-4 pb-8">
      {/* Single-Plane Layout (Telegram Mini App / AppFather style) */}
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

        {/* Nexus AI Plan Button - Premium CTA */}
        <button
          onClick={handleGenerateNexusPlan}
          disabled={isGeneratingPlan || !user}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all active:scale-[0.985] disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, var(--accent), #6d28d9)",
            color: "white",
            borderColor: "var(--accent)",
            boxShadow: "0 4px 14px 0 rgba(109, 40, 217, 0.25)",
          }}
        >
          {isGeneratingPlan ? (
            <>
              <span className="animate-spin">⟳</span> Генерирую ИИ-план Nexus...
            </>
          ) : (
            <>
              🤖 Сгенерировать ИИ-план Nexus
            </>
          )}
        </button>
        <p className="mt-1 text-center text-[10px]" style={{ color: "var(--text-muted)" }}>
          Получи персональный план действий от Claude
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

      {/* Focus Mode: Hide mission steps when AI agent is active to give 100% attention to the Terminal */}
      {showMissionSteps ? (
        <>
          {/* === Smart Quests (preview нового ядра продукта) === */}
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-lg font-semibold">Smart Quests</h2>
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: "var(--accent-glow)",
                  borderColor: "var(--accent)",
                  color: "var(--accent-light)",
                }}
              >
                preview
              </span>
            </div>
            <p
              className="mb-3 text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              Ты — CEO. AI-команда выполняет техническую работу. Подтверждай ключевые решения, давай ключи и принимай результат.
            </p>
            <div className="flex flex-col gap-3">
              {SMART_QUESTS_PREVIEW.map((quest) => {
                const isDone = completedQuestIds.has(quest.id);
                const liveQuest: SmartQuest = isDone
                  ? { ...quest, status: "completed" }
                  : quest;
                return (
                  <SmartQuestCard
                    key={quest.id}
                    quest={liveQuest}
                    onUserSubmit={handleQuestUserSubmit}
                    onScreenshotUpload={handleQuestScreenshotUpload}
                  />
                );
              })}
            </div>
          </div>

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

          {isAgentActive && (
            <button
              onClick={() => setShowMissionSteps(false)}
              className="mt-2 w-full py-2 text-xs font-medium rounded-lg border transition hover:bg-white/5"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              📋 Свернуть шаги миссии (фокус на агенте)
            </button>
          )}
        </>
      ) : (
        <button
          onClick={() => setShowMissionSteps(true)}
          className="mb-4 w-full py-2 text-sm font-medium rounded-xl border flex items-center justify-center gap-2 transition active:scale-[0.985]"
          style={{ 
            borderColor: 'var(--accent)', 
            color: 'var(--accent)',
            background: 'rgba(124, 58, 237, 0.08)'
          }}
        >
          📋 Развернуть шаги миссии
        </button>
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

      {/* Monolithic AIMentor (Agent Terminal) - right after mission steps in single-plane flow */}
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
        nexusPlan={nexusActions}
        onNexusExecute={handleNexusExecute}
        onNexusApprove={handleNexusApprove}
        onGeneratePlan={handleGenerateNexusPlan}
      />

      {/* === Workspace Artifacts: Visible Results (independent of AIMentor collapse) === */}
      {completedArtifacts.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xl">🚀</span>
            <h3 className="text-lg font-semibold">Сгенерированные артефакты</h3>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
              День {day}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {completedArtifacts.map((artifact) => {
              const isLanding = artifact.toolName === 'site_layout_builder' && artifact.result.html;
              const isDatabase = artifact.toolName === 'database_schema_builder' && artifact.result.sql;

              if (isLanding) {
                return (
                  <div
                    key={artifact.id}
                    className="p-5 rounded-2xl border transition hover:border-[var(--accent)]/50"
                    style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="text-3xl">🖥️</div>
                      <div>
                        <div className="font-semibold">Готовый Лендинг</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Tailwind • Конверсионная посадочная страница
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => openArtifactPreview(artifact.result.html!)}
                      className="w-full mt-2 py-2.5 text-sm font-semibold rounded-xl transition active:scale-[0.985]"
                      style={{ background: "var(--accent)", color: "white" }}
                    >
                      👁️ Открыть превью сайта
                    </button>
                  </div>
                );
              }

              if (isDatabase) {
                return (
                  <div
                    key={artifact.id}
                    className="p-5 rounded-2xl border transition hover:border-[var(--accent)]/50"
                    style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="text-3xl">🗄️</div>
                      <div>
                        <div className="font-semibold">Архитектура Базы Данных</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {artifact.projectName ? `${artifact.projectName} • ` : ""}Supabase PostgreSQL + RLS
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => openSqlPreview(artifact.result.sql!)}
                      className="w-full mt-2 py-2.5 text-sm font-semibold rounded-xl transition active:scale-[0.985]"
                      style={{ background: "#0ea5e9", color: "white" }}
                    >
                      💻 Посмотреть SQL-скрипт
                    </button>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}

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

      {/* Artifact Preview Modals (global for the mission page) */}
      <ArtifactPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewHtml(null);
        }}
        html={previewHtml}
        title="Готовый лендинг"
      />

      <SqlPreviewModal
        isOpen={isSqlPreviewOpen}
        onClose={() => {
          setIsSqlPreviewOpen(false);
          setPreviewSql(null);
        }}
        sql={previewSql}
        title="Сгенерированная SQL-схема"
      />
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
