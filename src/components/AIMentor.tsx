"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { NexusAction } from "@/lib/nexus/types";
import { useAuth } from "@/lib/auth";
import { ArtifactPreviewModal } from "./ArtifactPreviewModal";
import { SqlPreviewModal } from "./SqlPreviewModal";
import { CreditBalance } from "./CreditBalance";

interface AIMentorProps {
  missionTitle: string;
  currentStep: string;
  currentStepDesc?: string;
  currentDay: number;
  userResponses?: Record<string, string>;
  onStepExecuted?: () => void;

  // Nexus v2.0 Plan Mode
  nexusPlan?: NexusAction[];
  onNexusExecute?: (actionId: string) => void | Promise<void>;
  onNexusApprove?: (actionId: string) => void | Promise<void>;

  // Real plan generation from parent (useMissionNexus)
  onGeneratePlan?: () => void | Promise<void>;
}

const AIMentorComponent = ({
  missionTitle,
  currentStep,
  currentDay,
  nexusPlan = [],
  onNexusExecute,
  onNexusApprove,
  onGeneratePlan,
}: AIMentorProps) => {
  const { t } = useI18n();
  const { user } = useAuth();

  // Core states (kept from previous versions)
  const [executionMode, setExecutionMode] = useState(false);
  const [currentMicroStep, setCurrentMicroStep] = useState(0);
  const [executionLoading, setExecutionLoading] = useState(false);

  // Pipeline state for AppFather style
  const [pipelinePhase, setPipelinePhase] = useState<'idle' | 'plan_ready' | 'executing' | 'completed'>('idle');
  const [thinking, setThinking] = useState(false);

  // Artifact preview (HTML + SQL)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [previewSql, setPreviewSql] = useState<string | null>(null);
  const [isSqlPreviewOpen, setIsSqlPreviewOpen] = useState(false);

  // Reasoning Log state for Transparency (replaces Timeline)
  const [reasoningLogs, setReasoningLogs] = useState<Array<{text: string; status: 'thinking' | 'done' | 'error'}>>([]);
  const [isReasoningComplete, setIsReasoningComplete] = useState(false);

  // Retry support for failed executions (synchronous log)
  const [retryAction, setRetryAction] = useState<NexusAction | null>(null);

  // Real Billing State (Hold & Capture pattern) — demo starting balance
  const [balance, setBalance] = useState(1240);

  // Sync pipeline with props
  useEffect(() => {
    if (executionMode) {
      setPipelinePhase('executing');
    } else if (nexusPlan.length > 0) {
      setPipelinePhase('plan_ready');
    } else {
      setPipelinePhase('idle');
    }
  }, [nexusPlan, executionMode]);

  // Auto-complete log when real execution finishes (via prop update)
  useEffect(() => {
    if (pipelinePhase === 'executing' && reasoningLogs.length > 0 && !isReasoningComplete) {
      const recentlyCompleted = nexusPlan.find(a => a.status === 'completed' && a.result);
      if (recentlyCompleted) {
        completeCurrentReasoning(recentlyCompleted.result);
      }
    }
  }, [nexusPlan, pipelinePhase, reasoningLogs.length, isReasoningComplete]);

  const openSitePreview = (action: any) => {
    const html = action?.result?.html || previewHtml || '<h1>Demo Landing Page</h1>';
    setPreviewHtml(html);
    setIsPreviewOpen(true);
  };

  const openSqlPreview = (action?: any) => {
    const sql = action?.result?.sql || previewSql || '';
    if (sql) {
      setPreviewSql(sql);
      setIsSqlPreviewOpen(true);
    }
  };

  // Dynamic Action Bar handlers (demo)
  const handleGeneratePlan = () => {
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setPipelinePhase('plan_ready');
    }, 1600);
  };

  const handleExecute = async (action?: NexusAction) => {
    if (action && onNexusExecute) {
      // === REAL BILLING: Hold & Capture (check before spend) ===
      if (balance < 150) {
        setReasoningLogs([
          { text: `[❌] Недостаточно кредитов. Пополните баланс.`, status: 'error' }
        ]);
        setThinking(false);
        setRetryAction(null);
        return; // Abort — no API call
      }

      // === HARD SYNCHRONOUS LOG: exactly one line, then mutate on real result ===
      startDynamicReasoning(action.toolName);

      try {
        // Real execution in NexusEngine (calls /api/nexus/execute under the hood)
        await onNexusExecute(action.id);

        // SUCCESS: mutate the single log entry
        setReasoningLogs([
          { text: `[✅] Ответ получен. Артефакт сохранен.`, status: 'done' }
        ]);
        setIsReasoningComplete(true);
        setThinking(false);
        setRetryAction(null);

        // === CAPTURE: Deduct 150 credits only on real success (Refund Guard for errors)
        setBalance(prev => Math.max(0, prev - 150));

        // Trigger any result-driven side effects (preview, phase)
        completeCurrentReasoning();
      } catch (err: any) {
        const errorText = err?.message || err?.toString() || 'Неизвестная ошибка API';
        // ERROR: mutate the single log entry + enable Retry
        setReasoningLogs([
          { text: `[❌] Ошибка: ${errorText}`, status: 'error' }
        ]);
        setThinking(false);
        setRetryAction(action);
      }
    } else {
      setExecutionMode(true);
      setPipelinePhase('executing');
      setCurrentMicroStep(0);
    }
  };

  const handleCompleteStep = () => {
    const next = currentMicroStep + 1;
    if (next >= 4) {
      setPipelinePhase('completed');
      setExecutionMode(false);
    } else {
      setCurrentMicroStep(next);
    }
  };

  // Dynamic Reasoning Log - STRICTLY driven by real handleNexusExecute promise lifecycle (no setTimeout simulation)
  const startDynamicReasoning = (toolName?: string) => {
    // Add EXACTLY ONE log line on "Выполнить" click
    setReasoningLogs([
      { text: `[⏳] Отправка запроса провайдеру (Claude 3.5)...`, status: 'thinking' }
    ]);
    setIsReasoningComplete(false);
    setThinking(true);
    setRetryAction(null);
  };

  const completeCurrentReasoning = (result?: any) => {
    setReasoningLogs(prev => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const lastIndex = updated.length - 1;
      // Only mutate if not already our clean success message
      if (!updated[lastIndex].text.includes('Ответ получен')) {
        updated[lastIndex] = {
          ...updated[lastIndex],
          status: 'done',
          text: updated[lastIndex].text.replace('...', '') + ' ✅ Готово!'
        };
      }
      return updated;
    });
    setIsReasoningComplete(true);
    setPipelinePhase('completed');
    setRetryAction(null);

    if (result?.html) {
      setPreviewHtml(result.html);
    }
  };

  // Single-plane Agent Terminal (AppFather / Telegram Mini App style)
  const panelClassName = "w-full mx-auto max-w-3xl flex flex-col overflow-hidden rounded-3xl border";
  const panelStyle = {
    background: "linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92))",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)",
    backdropFilter: "blur(16px)",
  };

  return (
    <>
      <div className={panelClassName} style={panelStyle}>
        {/* === TOP: STATUS BAR (AppFather style) === */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ background: executionMode ? "linear-gradient(135deg, #059669, #10b981)" : "linear-gradient(135deg, var(--accent), #6d28d9)" }}>
          <div>
            <div className="text-white font-semibold text-sm">Идея: {missionTitle || currentStep}</div>
            <div className="text-white/70 text-[10px] mt-0.5">
              Состояние: {pipelinePhase === 'idle' && "Ожидание плана"}
              {pipelinePhase === 'plan_ready' && "План готов к исполнению"}
              {pipelinePhase === 'executing' && "Live Agent Pipeline активен"}
              {pipelinePhase === 'completed' && "Артефакт готов"}
            </div>
          </div>

          <CreditBalance balance={balance} className="scale-[0.8]" />
        </div>

        {/* === CENTER: REASONING LOG + Plan Actions (Transparency) === */}
        <div className="flex-1 flex flex-col min-h-0 p-4 overflow-hidden">
          {/* Show plan actions when ready, before/during log */}
          {pipelinePhase === 'plan_ready' && reasoningLogs.length === 0 && nexusPlan.length > 0 && (
            <div className="space-y-2 mb-4">
              <div className="text-xs uppercase text-[var(--text-muted)] mb-2">План действий</div>
              {nexusPlan.map((action, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                  <div className="text-sm">
                    {action.toolName} <span className="text-xs opacity-60">({action.status})</span>
                  </div>
                  {(action.status === 'pending' || action.status === 'approved') && onNexusExecute && (
                    <button
                      onClick={() => handleExecute(action)}
                      className="text-xs px-3 py-1 rounded bg-[var(--accent)] text-white"
                    >
                      Выполнить
                    </button>
                  )}
                  {action.status === 'executing' && (
                    <span className="text-xs px-3 py-1 text-[var(--accent)]">Выполняется...</span>
                  )}
                  {action.status === 'completed' && action.result?.html && (
                    <button onClick={() => openSitePreview(action)} className="text-xs px-3 py-1 rounded bg-green-600 text-white">
                      Превью
                    </button>
                  )}
                  {action.status === 'completed' && action.result?.sql && (
                    <button onClick={() => openSqlPreview(action)} className="text-xs px-3 py-1 rounded bg-green-600 text-white">
                      Посмотреть SQL
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto font-mono text-sm space-y-2 pr-2">
            {reasoningLogs.length === 0 && (pipelinePhase === 'executing' || thinking) && (
              <div className="text-[var(--text-muted)]">Запуск агента рассуждений...</div>
            )}

            {reasoningLogs.map((log, index) => (
              <div 
                key={index} 
                className={`flex items-start gap-2 ${log.status === 'thinking' ? 'text-[var(--accent)] animate-pulse' : log.status === 'done' ? 'text-green-400' : 'text-red-400'}`}
              >
                <span className="mt-0.5 flex-shrink-0">
                  {log.status === 'thinking' ? '⏳' : log.status === 'done' ? '✅' : '❌'}
                </span>
                <span className="leading-snug">{log.text}</span>
                {/* Retry button appears only for the error log entry */}
                {log.status === 'error' && retryAction && onNexusExecute && (
                  <button
                    onClick={() => { if (retryAction) void handleExecute(retryAction); }}
                    className="ml-3 text-xs px-2 py-0.5 rounded border border-red-400/60 hover:bg-red-950/30 active:scale-[0.985]"
                  >
                    Retry
                  </button>
                )}
              </div>
            ))}

            {thinking && reasoningLogs.length === 0 && (
              <div className="text-[var(--text-muted)] animate-pulse">Claude думает над структурой...</div>
            )}
          </div>
        </div>

        {/* === BOTTOM: DYNAMIC ACTION BAR === */}
        <div className="flex-shrink-0 border-t p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          {pipelinePhase === 'idle' && (
            <button
              onClick={() => {
                if (onGeneratePlan) {
                  onGeneratePlan();
                } else {
                  handleGeneratePlan(); // fallback demo
                }
              }}
              className="w-full py-3 text-sm font-semibold text-white rounded-xl transition active:scale-[0.985]"
              style={{ background: 'var(--accent)' }}
            >
              🚀 Сгенерировать план Nexus
            </button>
          )}

          {pipelinePhase === 'plan_ready' && (
            <div className="flex gap-3">
              <button onClick={() => handleExecute()} className="flex-1 py-3 text-sm font-semibold text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                ▶️ Выполнить
              </button>
              <button onClick={() => alert('Открыть редактор (ArtifactPreviewModal + isRefinement)')} className="flex-1 py-3 text-sm font-semibold rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                ✏️ Редактировать
              </button>
            </div>
          )}

          {pipelinePhase === 'executing' && (
            <div className="flex gap-3">
              <button onClick={handleCompleteStep} className="flex-1 py-3 text-sm font-semibold text-white rounded-xl" style={{ background: 'var(--accent)' }}>
                Следующий шаг →
              </button>
              <button onClick={() => { setExecutionMode(false); setPipelinePhase('completed'); }} className="flex-1 py-3 text-sm font-semibold rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                Завершить
              </button>
            </div>
          )}

          {pipelinePhase === 'completed' && isReasoningComplete && (
            <div className="flex gap-3">
              {/* Smart Action Bar: show SQL button for database_schema_builder results */}
              {nexusPlan.some((a) => a.status === 'completed' && a.result?.sql) ? (
                <button
                  onClick={() => {
                    const dbAction = nexusPlan.find((a) => a.status === 'completed' && a.result?.sql);
                    if (dbAction) openSqlPreview(dbAction);
                  }}
                  className="flex-1 py-3 text-sm font-semibold text-white rounded-xl"
                  style={{ background: 'var(--success)' }}
                >
                  👁️ Посмотреть SQL-скрипт
                </button>
              ) : (
                <>
                  <button
                    onClick={() => openSitePreview({ result: { html: previewHtml || '<div>Demo HTML</div>' } })}
                    className="flex-1 py-3 text-sm font-semibold text-white rounded-xl"
                    style={{ background: 'var(--success)' }}
                  >
                    👁️ Превью
                  </button>
                  <button
                    onClick={() => alert('Скачивание HTML...')}
                    className="flex-1 py-3 text-sm font-semibold rounded-xl border"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    💾 Скачать
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ArtifactPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => { setIsPreviewOpen(false); setPreviewHtml(null); }}
        html={previewHtml}
        title="Готовый лендинг"
      />
      <SqlPreviewModal
        isOpen={isSqlPreviewOpen}
        onClose={() => { setIsSqlPreviewOpen(false); }}
        sql={previewSql}
        title="Сгенерированная SQL-схема"
      />
    </>
  );
};

export const AIMentor = AIMentorComponent;
