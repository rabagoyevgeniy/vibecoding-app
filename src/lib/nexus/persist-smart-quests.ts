/**
 * Генерация и сохранение Smart Quests при работе Nexus Engine.
 * Вызывается из `/api/nexus/plan` после формирования списка tool-actions.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NexusAction } from "@/lib/nexus/types";
import type { SmartQuestRow } from "@/lib/smart-quests";
import type { SmartQuestExecutionType } from "@/components/quests/SmartQuestCard";

export interface SmartQuestInsertRow {
  user_id: string;
  day: number;
  order_index: number;
  execution_type: SmartQuestExecutionType;
  title: string;
  description: string;
  input_label?: string | null;
  input_placeholder?: string | null;
  ai_log_lines?: string[] | null;
  status: "pending";
  project_id?: string | null;
  xp_reward: number;
}

const XP_BY_INDEX = [50, 65, 80, 90, 100] as const;

function xpForIndex(index: number): number {
  return XP_BY_INDEX[Math.min(index, XP_BY_INDEX.length - 1)];
}

function extractProjectIdFromActions(actions: NexusAction[]): string | null {
  for (const action of actions) {
    const input = action.input as Record<string, unknown> | undefined;
    if (!input) continue;

    const candidates = [
      input.project_id,
      input.projectId,
      input.supabase_project_id,
    ];

    for (const value of candidates) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }
  return null;
}

type SmartQuestInsertPayload = Omit<SmartQuestInsertRow, "user_id" | "day">;

function questFromToolAction(
  action: NexusAction,
  orderIndex: number,
  day: number,
  projectId: string | null
): SmartQuestInsertPayload {
  const idea =
    (action.input as Record<string, unknown> | undefined)?.idea ??
    (action.input as Record<string, unknown> | undefined)?.project_name;

  const ideaText =
    typeof idea === "string" && idea.trim() ? idea.trim() : "вашего проекта";

  const base = {
    order_index: orderIndex,
    status: "pending" as const,
    xp_reward: xpForIndex(orderIndex),
  };

  switch (action.toolName) {
    case "business_model_generator":
      return {
        ...base,
        execution_type: "ai_auto",
        title: "AI-команда строит бизнес-модель",
        description: `Техническая команда сформирует Business Model Canvas для «${ideaText}». От тебя — только финальное одобрение результата (День ${day}).`,
        ai_log_lines: [
          "Анализирую нишу и целевую аудиторию…",
          "Считаю unit-экономику и каналы привлечения…",
          "Собираю Business Model Canvas…",
        ],
      };
    case "site_layout_builder":
      return {
        ...base,
        execution_type: "ai_auto",
        title: "AI-команда собирает лендинг",
        description:
          "Дизайнер и разработчик подготовят структуру посадочной страницы с hero, преимуществами и тарифами. Проверь превью и подтверди публикацию.",
        ai_log_lines: [
          "Генерирую структуру секций…",
          "Подбираю копирайт и CTA…",
          "Собираю Tailwind-разметку…",
        ],
      };
    case "database_schema_builder":
      return {
        ...base,
        execution_type: "ai_vision_help",
        title: "Включи Row Level Security в Supabase",
        description:
          "Перейди в Authentication → Policies, выбери таблицы с пользовательскими данными и включи RLS. Загрузи скриншот — AI-наставник подскажет, что исправить.",
        project_id: projectId,
      };
    case "lead_campaign_builder":
      return {
        ...base,
        execution_type: "user_action",
        title: "Подключи рекламный канал или API-ключ",
        description:
          "Вставь ключ доступа к рекламному кабинету или Stripe (если настраиваешь оплату). AI-команда проверит формат и сохранит прогресс.",
        input_label: "API / Secret Key",
        input_placeholder: "sk_live_... или токен рекламного кабинета",
      };
    default:
      return {
        ...base,
        execution_type: "ai_auto",
        title: `AI выполняет: ${action.toolName.replace(/_/g, " ")}`,
        description: `Команда Nexus запускает инструмент «${action.toolName}» для дня ${day}. Дождись результата в терминале и подтверди шаг.`,
        ai_log_lines: ["Инициализирую инструмент…", "Выполняю задачу…"],
      };
  }
}

/** Демо-квесты для тестового промпта Profit Swimming (совпадают с прежним preview). */
export function buildDemoSmartQuests(
  userId: string,
  day: number,
  projectId: string | null
): SmartQuestInsertRow[] {
  return [
    {
      user_id: userId,
      day,
      order_index: 0,
      execution_type: "ai_auto",
      title: "AI-команда поднимает Next.js + Supabase для школы плавания",
      description:
        "Техническая команда сама создаст репозиторий, развернёт фронт и базу. От тебя — только финальное одобрение.",
      status: "pending",
      xp_reward: 50,
      ai_log_lines: [
        "Создаю репозиторий…",
        "Подключаю Supabase…",
        "Деплою preview на Vercel…",
      ],
    },
    {
      user_id: userId,
      day,
      order_index: 1,
      execution_type: "user_action",
      title: "Подключи Stripe для приёма оплат за абонементы",
      description:
        "Зайди в dashboard.stripe.com → Developers → API keys и вставь сюда secret key. AI проверит ключ и завершит шаг.",
      input_label: "Stripe Secret Key",
      input_placeholder: "sk_live_...",
      status: "pending",
      xp_reward: 65,
    },
    {
      user_id: userId,
      day,
      order_index: 2,
      execution_type: "ai_vision_help",
      title: "Включи Row Level Security для таблицы bookings",
      description:
        "Перейди в Authentication → Policies, выбери таблицу bookings и нажми Enable RLS, чтобы клиенты не видели чужие записи.",
      status: "pending",
      xp_reward: 80,
      project_id: projectId ?? "demo-swim-school-abc123",
    },
  ];
}

/**
 * Строит строки для INSERT из списка Nexus tool-actions.
 * Если actions пуст — один универсальный ai_auto квест по промпту.
 */
export function buildSmartQuestsFromPlan(
  userId: string,
  day: number,
  actions: NexusAction[],
  userPrompt: string,
  projectId: string | null
): SmartQuestInsertRow[] {
  const resolvedProjectId = projectId ?? extractProjectIdFromActions(actions);

  if (actions.length === 0) {
    return [
      {
        user_id: userId,
        day,
        order_index: 0,
        execution_type: "ai_auto",
        title: "AI-команда анализирует задачу дня",
        description: userPrompt.slice(0, 500) || `Персональный план Nexus для дня ${day}.`,
        status: "pending",
        xp_reward: 50,
        ai_log_lines: ["Читаю контекст миссии…", "Формирую план действий…"],
      },
    ];
  }

  return actions.map((action, index) => ({
    user_id: userId,
    day,
    ...questFromToolAction(action, index, day, resolvedProjectId),
  }));
}

export type PersistSmartQuestsResult = {
  inserted: boolean;
  quests: SmartQuestRow[];
};

/**
 * Сохраняет квесты в `smart_quests`:
 * - если есть completed/running — не трогаем (идемпотентность);
 * - иначе удаляем старые pending на этот день и вставляем новые.
 */
export async function persistSmartQuestsForDay(
  supabase: SupabaseClient,
  userId: string,
  day: number,
  quests: SmartQuestInsertRow[]
): Promise<PersistSmartQuestsResult> {
  const { data: existing, error: fetchError } = await supabase
    .from("smart_quests")
    .select("*")
    .eq("user_id", userId)
    .eq("day", day)
    .order("order_index", { ascending: true });

  if (fetchError) {
    console.error("[persistSmartQuests] fetch existing failed:", fetchError);
    throw new Error("Failed to load existing smart quests");
  }

  const rows = (existing ?? []) as SmartQuestRow[];

  const hasInProgress = rows.some(
    (q) => q.status === "completed" || q.status === "running"
  );

  if (rows.length > 0 && hasInProgress) {
    return { inserted: false, quests: rows };
  }

  if (rows.length > 0) {
    const { error: deleteError } = await supabase
      .from("smart_quests")
      .delete()
      .eq("user_id", userId)
      .eq("day", day)
      .eq("status", "pending");

    if (deleteError) {
      console.error("[persistSmartQuests] delete pending failed:", deleteError);
      throw new Error("Failed to clear pending smart quests");
    }
  }

  if (quests.length === 0) {
    return { inserted: false, quests: [] };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("smart_quests")
    .insert(quests)
    .select("*");

  if (insertError) {
    console.error("[persistSmartQuests] insert failed:", insertError);
    throw new Error("Failed to insert smart quests");
  }

  return {
    inserted: true,
    quests: (inserted ?? []) as SmartQuestRow[],
  };
}

/** project_id из профиля (если пользователь сохранил его в onboarding). */
export async function resolveProjectIdFromProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  try {
    const { data: profile } = await supabase
      .from("vc_profiles")
      .select("onboarding_answers, onboarding_data")
      .eq("user_id", userId)
      .maybeSingle();

    const onboarding =
      (profile?.onboarding_answers as Record<string, unknown> | null) ??
      (profile?.onboarding_data as Record<string, unknown> | null) ??
      {};

    const candidates = [
      onboarding.supabase_project_id,
      onboarding.project_id,
      onboarding.supabaseProjectId,
    ];

    for (const value of candidates) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  } catch {
    // optional
  }
  return null;
}
