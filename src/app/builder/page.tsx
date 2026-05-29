"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { nexusEngine } from "@/lib/nexus";
import type { NexusAction } from "@/lib/nexus/types";

const BUILDER_DAY = 0; // Dedicated day for free-form builder plans (persisted via Nexus)

const TOOL_LABELS: Record<string, string> = {
  business_model_generator: "Бизнес-модель (Lean Canvas)",
  site_layout_builder: "Структура премиум-лендинга",
  lead_campaign_builder: "Рекламная кампания (High-Risk)",
};

export default function BuilderPage() {
  const { t } = useI18n();
  const { user } = useAuth();

  const [idea, setIdea] = useState("");
  const [nexusActions, setNexusActions] = useState<NexusAction[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  // Restore previous builder plan on mount (persistence via NexusEngine + Supabase)
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      try {
        const actions = await nexusEngine.loadActionsForDay(user.id, BUILDER_DAY);
        if (actions.length > 0) {
          setNexusActions(actions);
        }
      } catch (e) {
        console.error("[Builder] Failed to restore Nexus plan", e);
      }
    })();
  }, [user?.id]);

  const refreshActions = useCallback(() => {
    if (!user?.id) return;
    const updated = nexusEngine.getActionsForDay(user.id, BUILDER_DAY);
    setNexusActions(updated);
  }, [user?.id]);

  const handleGenerate = useCallback(async () => {
    if (!user?.id || !idea.trim() || isGenerating) return;

    setIsGenerating(true);

    try {
      const result = await nexusEngine.generatePlan(
        user.id,
        idea.trim(),
        BUILDER_DAY
      );
      setNexusActions(result.actions);
    } catch (e) {
      console.error("[Builder] Nexus plan generation failed", e);
      // Graceful empty state – user can retry
    } finally {
      setIsGenerating(false);
    }
  }, [user?.id, idea, isGenerating]);

  const handleExecute = useCallback(async (actionId: string) => {
    if (!user?.id) return;

    setLoadingActionId(actionId);
    try {
      await nexusEngine.executeAction(actionId, user.id);
      refreshActions();
    } catch (e) {
      console.error("[Builder] Execute failed", e);
    } finally {
      setLoadingActionId(null);
    }
  }, [user?.id, refreshActions]);

  const handleApprove = useCallback(async (actionId: string) => {
    if (!user?.id) return;

    setLoadingActionId(actionId);
    try {
      await nexusEngine.approveAction(actionId, user.id);
      refreshActions();
    } catch (e) {
      console.error("[Builder] Approve failed", e);
    } finally {
      setLoadingActionId(null);
    }
  }, [user?.id, refreshActions]);

  // Reusable premium card renderer (matches AIMentor UX exactly)
  function renderActionCard(action: NexusAction) {
    const riskColor =
      action.riskLevel === "high"
        ? "#ef4444"
        : action.riskLevel === "medium"
        ? "#f59e0b"
        : "#22c55e";

    const isLoading = loadingActionId === action.id;
    const canExecute = (action.status === "pending" || action.status === "approved") && !isLoading;
    const needsApproval = action.riskLevel !== "low" && action.status === "pending";
    const label = TOOL_LABELS[action.toolName] || action.toolName;

    // Smart preview (same logic as in AIMentor for consistency)
    let preview: React.ReactNode = null;

    if (action.toolName === "business_model_generator" && action.input?.idea) {
      preview = (
        <div className="mt-1 text-[11px] opacity-80">
          Lean Canvas для: <span className="font-medium">"{action.input.idea.slice(0, 70)}..."</span>
        </div>
      );
    }

    if (action.toolName === "site_layout_builder" && action.input?.hero) {
      const advCount = action.input.advantages?.length || 0;
      const tiers = action.input.pricing?.tiers || [];
      preview = (
        <details className="mt-2 rounded-lg border border-white/10 bg-black/10 p-2 text-[10px] opacity-90">
          <summary className="cursor-pointer font-semibold text-[11px]">
            🏠 Hero + {advCount} фич + {tiers.length} тарифа
          </summary>
          <div className="mt-1 text-[10px] leading-tight opacity-80">
            {action.input.hero.title} — {action.input.hero.subtitle}
          </div>
        </details>
      );
    }

    if (action.toolName === "lead_campaign_builder" && action.input?.target_audience) {
      preview = (
        <div className="mt-2 rounded-lg border border-red-500/30 bg-red-950/20 p-2 text-[10px]">
          <div className="mb-1 font-bold text-red-400">⚠️ HIGH RISK — Реклама</div>
          <div className="text-red-300">Бюджет: {action.input.recommended_budget?.daily || "—"} / день</div>
        </div>
      );
    }

    return (
      <div
        key={action.id}
        className="rounded-xl border p-4 text-sm"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-base leading-tight">{label}</div>
            {preview}
            {!preview && (
              <div className="mt-1 text-[11px] opacity-70 line-clamp-2">
                {Object.entries(action.input || {})
                  .slice(0, 3)
                  .map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`)
                  .join(" · ")}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 text-[10px] flex-shrink-0">
            <span
              className="rounded px-2 py-0.5 font-bold uppercase tracking-[1px]"
              style={{
                background: riskColor + "22",
                color: riskColor,
                fontSize: "9px",
              }}
            >
              {action.riskLevel}
            </span>
            <span className="opacity-60 text-[10px]">{action.status.replace("_", " ")}</span>
          </div>
        </div>

        {/* Action Buttons — identical UX to mission page */}
        <div className="mt-3 flex gap-2">
          {needsApproval && (
            <button
              onClick={() => handleApprove(action.id)}
              disabled={isLoading}
              className="flex-1 rounded-lg bg-amber-500 py-2 text-xs font-semibold text-white active:bg-amber-600 disabled:opacity-60 flex items-center justify-center gap-1"
            >
              {isLoading ? "⏳ Подтверждаем..." : "Подтвердить (HITL)"}
            </button>
          )}

          {canExecute && (
            <button
              onClick={() => handleExecute(action.id)}
              disabled={isLoading}
              className="flex-1 rounded-lg py-2 text-xs font-semibold text-white active:opacity-80 disabled:opacity-60 flex items-center justify-center gap-1"
              style={{ background: "var(--accent)" }}
            >
              {isLoading ? "⏳ Выполняем..." : "Выполнить действие"}
            </button>
          )}

          {action.status === "completed" && (
            <div className="flex-1 rounded-lg bg-green-500/20 py-2 text-center text-xs font-medium text-green-400">
              ✓ Артефакт сохранён
            </div>
          )}

          {action.status === "failed" && (
            <div className="flex-1 rounded-lg bg-red-500/20 py-2 text-center text-xs font-medium text-red-400">
              Ошибка выполнения
            </div>
          )}
        </div>

        {action.error && (
          <div className="mt-2 text-[10px] text-red-400">{action.error}</div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm hover:underline"
        style={{ color: "var(--text-muted)" }}
      >
        ← Назад в дашборд
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          🛠️ Nexus Builder
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Создай персональный план с помощью ИИ-агента. Получи реальные артефакты (модели, лендинги, кампании).
        </p>
      </div>

      {/* Idea Input */}
      <div className="mb-4">
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Опиши свою бизнес-идею (например: школа плавания для детей с AI-анализом техники)"
          rows={3}
          className="w-full resize-y rounded-xl p-4 text-sm outline-none"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={!user || !idea.trim() || isGenerating}
        className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition active:scale-[0.985] disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, var(--accent), #6d28d9)",
        }}
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⟳</span> Генерирую план Nexus...
          </span>
        ) : (
          "🚀 Сгенерировать план с Nexus AI"
        )}
      </button>

      {!user && (
        <p className="mt-2 text-center text-xs" style={{ color: "var(--text-muted)" }}>
          Войдите, чтобы сохранять планы между сессиями
        </p>
      )}

      {/* Nexus Interactive Plan — unified with AIMentor experience */}
      {nexusActions.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                NEXUS PLAN • BUILDER
              </div>
              <div className="text-lg font-bold">Ваш персональный план действий</div>
            </div>
            <button
              onClick={() => {
                setNexusActions([]);
                setIdea("");
              }}
              className="text-xs opacity-60 hover:opacity-100"
            >
              Сбросить
            </button>
          </div>

          <div className="space-y-3">
            {nexusActions.map(renderActionCard)}
          </div>

          <p className="mt-4 text-center text-[10px] opacity-60">
            Выполненные действия сохраняют артефакты в твой профиль
          </p>
        </div>
      )}

      {nexusActions.length === 0 && !isGenerating && (
        <div className="mt-10 text-center text-sm opacity-60">
          Введи идею и нажми кнопку — Nexus создаст 3–5 умных действий<br />
          с разным уровнем риска и интерактивным подтверждением.
        </div>
      )}
    </div>
  );
}
