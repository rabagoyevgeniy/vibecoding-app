"use client";

/**
 * SmartQuestCard — премиум UI карточки Smart Quest.
 *
 * Поведение ветвится по `execution_type`:
 *   - "ai_auto"        — ИИ-команда выполняет шаг сама (терминальный лоадер + lock-кнопка).
 *   - "user_action"    — нужно действие CEO (ввод ключа / решение) с кнопкой подтверждения.
 *   - "ai_vision_help" — пользователь застрял, загружает скриншот, AI-наставник подскажет.
 *
 * Соответствует таблице `smart_quests` (Supabase). Презентационный компонент:
 * не делает запросов сам, а отдаёт колбэки наружу.
 */

import {
  Bot,
  Check,
  HelpCircle,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Terminal,
  Upload,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";

export type SmartQuestExecutionType = "ai_auto" | "user_action" | "ai_vision_help";

export type SmartQuestStatus = "pending" | "running" | "completed" | "failed";

export interface SmartQuest {
  id: string;
  title: string;
  description: string;
  execution_type: SmartQuestExecutionType;
  // Опциональные поля под user_action
  input_label?: string | null;
  input_placeholder?: string | null;
  // Опциональные строки логов под ai_auto (если нет — используется дефолтный набор)
  ai_log_lines?: string[] | null;
  status?: SmartQuestStatus;
  result?: string | null;
}

export interface SmartQuestCardProps {
  quest: SmartQuest;
  /** Колбэк для execution_type === "user_action". */
  onUserSubmit?: (questId: string, value: string) => void | Promise<void>;
  /** Колбэк для execution_type === "ai_vision_help". */
  onScreenshotUpload?: (questId: string, file: File) => void | Promise<void>;
  className?: string;
}

const DEFAULT_AI_LOG_LINES = [
  "$ vibecoding agent init --mission=current",
  "› parsing project context...",
  "› spinning up sandbox container",
  "› generating Next.js scaffolding",
  "› writing src/app/page.tsx",
  "› wiring Supabase client",
  "› deploying preview build → vercel",
  "✓ artifact ready (waiting on CEO approval)",
];

export function SmartQuestCard({
  quest,
  onUserSubmit,
  onScreenshotUpload,
  className = "",
}: SmartQuestCardProps) {
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${className}`}
      style={{
        background:
          "linear-gradient(160deg, var(--bg-card) 0%, rgba(124,58,237,0.04) 100%)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      {/* Декоративный неоновый блик в правом верхнем углу */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl opacity-40"
        style={{ background: "var(--accent-glow)" }}
      />

      <CardHeader quest={quest} />

      <div className="relative mt-4">
        {quest.execution_type === "ai_auto" && <AiAutoBody quest={quest} />}
        {quest.execution_type === "user_action" && (
          <UserActionBody quest={quest} onSubmit={onUserSubmit} />
        )}
        {quest.execution_type === "ai_vision_help" && (
          <AiVisionHelpBody quest={quest} onUpload={onScreenshotUpload} />
        )}
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

function CardHeader({ quest }: { quest: SmartQuest }) {
  const meta = useMemo(() => getExecutionMeta(quest.execution_type), [quest.execution_type]);
  const Icon = meta.icon;

  return (
    <header className="relative flex items-start gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: meta.iconBg,
          border: `1px solid ${meta.iconBorder}`,
          color: meta.iconColor,
          boxShadow: meta.iconShadow,
        }}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-semibold tracking-tight">
            {quest.title}
          </h3>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: meta.badgeBg,
              color: meta.badgeColor,
              border: `1px solid ${meta.badgeBorder}`,
              borderRadius: "var(--radius-full)",
            }}
          >
            <meta.BadgeIcon className="h-3 w-3" />
            {meta.badgeLabel}
          </span>
        </div>
        <p
          className="mt-1 text-sm leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          {quest.description}
        </p>
      </div>
    </header>
  );
}

function getExecutionMeta(type: SmartQuestExecutionType) {
  switch (type) {
    case "ai_auto":
      return {
        icon: Bot,
        iconBg: "rgba(124,58,237,0.18)",
        iconBorder: "rgba(124,58,237,0.5)",
        iconColor: "var(--accent-light)",
        iconShadow: "0 0 24px rgba(124,58,237,0.35)",
        badgeBg: "rgba(124,58,237,0.18)",
        badgeBorder: "rgba(124,58,237,0.5)",
        badgeColor: "var(--accent-light)",
        badgeLabel: "AI-команда",
        BadgeIcon: Sparkles,
      };
    case "user_action":
      return {
        icon: KeyRound,
        iconBg: "rgba(245,158,11,0.15)",
        iconBorder: "rgba(245,158,11,0.5)",
        iconColor: "var(--warning)",
        iconShadow: "0 0 24px rgba(245,158,11,0.28)",
        badgeBg: "rgba(245,158,11,0.15)",
        badgeBorder: "rgba(245,158,11,0.45)",
        badgeColor: "var(--warning)",
        badgeLabel: "Действие CEO",
        BadgeIcon: ShieldCheck,
      };
    case "ai_vision_help":
      return {
        icon: HelpCircle,
        iconBg: "rgba(14,165,233,0.15)",
        iconBorder: "rgba(14,165,233,0.5)",
        iconColor: "#38bdf8",
        iconShadow: "0 0 24px rgba(14,165,233,0.3)",
        badgeBg: "rgba(14,165,233,0.15)",
        badgeBorder: "rgba(14,165,233,0.5)",
        badgeColor: "#38bdf8",
        badgeLabel: "AI Vision",
        BadgeIcon: ImageIcon,
      };
  }
}

/* -------------------------------------------------------------------------- */
/* ai_auto                                                                    */
/* -------------------------------------------------------------------------- */

function AiAutoBody({ quest }: { quest: SmartQuest }) {
  const lines = quest.ai_log_lines?.length ? quest.ai_log_lines : DEFAULT_AI_LOG_LINES;
  const isCompleted = quest.status === "completed";

  // Эффект «бегущего терминала»: каждые 900мс показываем следующую строку.
  // Когда дошли до конца — оставляем все строки видимыми и мигаем курсором.
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    if (isCompleted) {
      setVisibleCount(lines.length);
      return;
    }

    if (visibleCount >= lines.length) return;

    const timeout = setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 1, lines.length));
    }, 900);

    return () => clearTimeout(timeout);
  }, [visibleCount, lines.length, isCompleted]);

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-xl border font-mono text-[12px] leading-relaxed"
        style={{
          background: "#06060d",
          borderColor: "rgba(124,58,237,0.35)",
          boxShadow:
            "inset 0 0 24px rgba(124,58,237,0.12), 0 0 32px rgba(124,58,237,0.18)",
        }}
      >
        {/* Псевдо-шапка терминала */}
        <div
          className="flex items-center gap-2 border-b px-3 py-2"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
          <div className="ml-3 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40">
            <Terminal className="h-3 w-3" />
            ai-team.terminal
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--accent-light)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-light)] shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
            running
          </div>
        </div>

        {/* Лог */}
        <div className="relative min-h-[140px] px-4 py-3">
          {/* Сканлайн-эффект (тонкая бегущая полоса) */}
          {!isCompleted && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-12 opacity-40"
              style={{
                background:
                  "linear-gradient(180deg, rgba(124,58,237,0.18) 0%, transparent 100%)",
                animation: "smartQuestScan 2.4s ease-in-out infinite",
              }}
            />
          )}

          <ul className="relative space-y-1">
            {lines.slice(0, visibleCount).map((line, i) => {
              const isLastVisible = i === visibleCount - 1;
              const isFinal = isLastVisible && visibleCount === lines.length;
              const isPositive = line.trim().startsWith("✓");
              return (
                <li
                  key={i}
                  className="flex items-start gap-2"
                  style={{
                    color: isPositive ? "#4ade80" : "rgba(240,240,245,0.85)",
                  }}
                >
                  <span
                    aria-hidden
                    className="select-none pt-px text-[var(--accent-light)]/70"
                  >
                    {isPositive ? "" : ">"}
                  </span>
                  <span className="break-all">
                    {line}
                    {isLastVisible && !isFinal && (
                      <span
                        className="ml-0.5 inline-block h-3 w-[7px] translate-y-[2px] bg-[var(--accent-light)]"
                        style={{ animation: "smartQuestCaret 1s steps(1) infinite" }}
                      />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Подпись + locked CTA */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent-light)]" />
          <span>
            {isCompleted
              ? "AI-команда завершила задачу. Жду подтверждения."
              : "AI-команда выполняет задачу..."}
          </span>
        </div>
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold opacity-70"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderColor: "var(--border)",
            color: "var(--text-muted)",
          }}
        >
          <Lock className="h-3.5 w-3.5" />
          Заблокировано
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* user_action                                                                */
/* -------------------------------------------------------------------------- */

function UserActionBody({
  quest,
  onSubmit,
}: {
  quest: SmartQuest;
  onSubmit?: (questId: string, value: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(quest.status === "completed");

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || isSubmitting || done) return;

      try {
        setIsSubmitting(true);
        await onSubmit?.(quest.id, trimmed);
        setDone(true);
      } finally {
        setIsSubmitting(false);
      }
    },
    [value, isSubmitting, done, onSubmit, quest.id]
  );

  const label = quest.input_label ?? "Введи значение";
  const placeholder = quest.input_placeholder ?? "sk-live-...";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </label>

      <div
        className="flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-glow)]"
        style={{
          background: "rgba(0,0,0,0.25)",
          borderColor: "var(--border-hover)",
        }}
      >
        <KeyRound className="h-4 w-4 shrink-0 text-[var(--warning)]" />
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          disabled={done}
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-white/25 disabled:opacity-60"
        />
        {done && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(34,197,94,0.15)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--success)]">
            <Check className="h-3 w-3" />
            ок
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={!value.trim() || isSubmitting || done}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: done
            ? "linear-gradient(135deg, var(--success), #16a34a)"
            : "linear-gradient(135deg, var(--accent), #6d28d9)",
          boxShadow: done ? "0 0 18px rgba(34,197,94,0.35)" : "var(--shadow-glow)",
        }}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Проверяю...
          </>
        ) : done ? (
          <>
            <Check className="h-4 w-4" />
            Задача завершена
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" />
            Проверить & Завершить
          </>
        )}
      </button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* ai_vision_help                                                             */
/* -------------------------------------------------------------------------- */

function AiVisionHelpBody({
  quest,
  onUpload,
}: {
  quest: SmartQuest;
  onUpload?: (questId: string, file: File) => void | Promise<void>;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Чистим object URL при размонтировании, чтобы не текла память.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const acceptFile = useCallback(
    (incoming: File | null | undefined) => {
      if (!incoming) return;
      if (!incoming.type.startsWith("image/")) return;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(incoming);
      setFile(incoming);
      setPreviewUrl(url);
      void onUpload?.(quest.id, incoming);
    },
    [onUpload, previewUrl, quest.id]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
      acceptFile(event.dataTransfer.files?.[0]);
    },
    [acceptFile]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  }, []);

  const handleReset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [previewUrl]);

  if (file && previewUrl) {
    return (
      <div className="space-y-3">
        <div
          className="relative overflow-hidden rounded-xl border"
          style={{ borderColor: "rgba(14,165,233,0.4)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={file.name}
            className="block max-h-72 w-full object-contain"
            style={{ background: "rgba(0,0,0,0.4)" }}
          />
          <button
            type="button"
            onClick={handleReset}
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/90 transition hover:bg-black/80"
            aria-label="Удалить скриншот"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs"
          style={{
            background: "rgba(14,165,233,0.08)",
            borderColor: "rgba(14,165,233,0.35)",
            color: "#bae6fd",
          }}
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          AI-наставник анализирует экран... Сейчас подскажу, куда нажать.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="group/drop relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all"
        style={{
          background: dragActive
            ? "rgba(14,165,233,0.08)"
            : "rgba(255,255,255,0.02)",
          borderColor: dragActive ? "#38bdf8" : "rgba(14,165,233,0.35)",
          boxShadow: dragActive ? "0 0 24px rgba(14,165,233,0.25)" : "none",
        }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover/drop:scale-110"
          style={{
            background: "rgba(14,165,233,0.15)",
            border: "1px solid rgba(14,165,233,0.45)",
            color: "#38bdf8",
            boxShadow: "0 0 24px rgba(14,165,233,0.25)",
          }}
        >
          <Upload className="h-5 w-5" />
        </div>

        <div>
          <div className="text-sm font-semibold">
            Застрял? Загрузи скриншот экрана
          </div>
          <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            AI-наставник подскажет, куда нажать. Перетащи файл сюда или нажми, чтобы выбрать.
          </div>
        </div>

        <span
          className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: "rgba(14,165,233,0.12)",
            color: "#7dd3fc",
            border: "1px solid rgba(14,165,233,0.4)",
          }}
        >
          <ImageIcon className="h-3 w-3" />
          PNG / JPG до 10MB
        </span>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => acceptFile(event.target.files?.[0])}
        />
      </div>
    </div>
  );
}
