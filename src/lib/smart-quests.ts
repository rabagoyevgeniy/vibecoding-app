import type {
  SmartQuest,
  SmartQuestExecutionType,
  SmartQuestStatus,
} from "@/components/quests/SmartQuestCard";

/** Строка таблицы `smart_quests` (Supabase). */
export interface SmartQuestRow {
  id: string;
  user_id: string;
  day: number;
  order_index: number;
  execution_type: string;
  title: string;
  description: string;
  input_label: string | null;
  input_placeholder: string | null;
  ai_log_lines: unknown;
  status: string;
  result: string | null;
  project_id: string | null;
  xp_reward: number;
  created_at?: string;
  updated_at?: string;
}

const EXECUTION_TYPES: SmartQuestExecutionType[] = [
  "ai_auto",
  "user_action",
  "ai_vision_help",
];

const STATUSES: SmartQuestStatus[] = ["pending", "running", "completed", "failed"];

function isExecutionType(value: string): value is SmartQuestExecutionType {
  return EXECUTION_TYPES.includes(value as SmartQuestExecutionType);
}

function isStatus(value: string): value is SmartQuestStatus {
  return STATUSES.includes(value as SmartQuestStatus);
}

function parseAiLogLines(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const lines = raw.filter((line): line is string => typeof line === "string");
  return lines.length > 0 ? lines : null;
}

/** Маппинг строки Supabase → UI-модель `SmartQuest`. */
export function mapSmartQuestRow(row: SmartQuestRow): SmartQuest {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    execution_type: isExecutionType(row.execution_type)
      ? row.execution_type
      : "user_action",
    input_label: row.input_label,
    input_placeholder: row.input_placeholder,
    ai_log_lines: parseAiLogLines(row.ai_log_lines),
    status: isStatus(row.status) ? row.status : "pending",
    result: row.result,
    project_id: row.project_id,
  };
}
