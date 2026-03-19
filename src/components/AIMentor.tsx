"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { parseExecutionPlan, type MicroAction, type ExecutionPlan } from "@/lib/execution-mode";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIMentorProps {
  missionTitle: string;
  currentStep: string;
  currentStepDesc?: string;
  currentDay: number;
  userResponses?: Record<string, string>;
  onStepExecuted?: () => void;
}

const ACTION_ICONS: Record<MicroAction["type"], string> = {
  do: "👉",
  say: "💬",
  click: "👆",
  write: "✍️",
  confirm: "✅",
};

export function AIMentor({
  missionTitle,
  currentStep,
  currentStepDesc,
  currentDay,
  userResponses,
  onStepExecuted,
}: AIMentorProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef(currentStep);

  // Execution mode state
  const [executionMode, setExecutionMode] = useState(false);
  const [executionPlan, setExecutionPlan] = useState<ExecutionPlan | null>(null);
  const [currentMicroStep, setCurrentMicroStep] = useState(0);
  const [executionLoading, setExecutionLoading] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendToAI = useCallback(
    async (userMessage: string, isAutoGreet = false) => {
      if (!isAutoGreet) {
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
      }
      setLoading(true);

      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            current_day: currentDay,
            current_step: currentStep,
            current_step_desc: currentStepDesc,
            mission_title: missionTitle,
            user_message: userMessage,
            user_responses: userResponses,
            is_proactive: isAutoGreet,
            history: messages.slice(-6),
          }),
        });

        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response || t("mentor.error") },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: t("mentor.error") },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [currentDay, currentStep, currentStepDesc, missionTitle, userResponses, messages, t]
  );

  useEffect(() => {
    if (open && !hasGreeted && messages.length === 0) {
      setHasGreeted(true);
      sendToAI(
        `[SYSTEM] The user just opened the AI Mentor on Day ${currentDay}, step: "${currentStep}". Give a proactive coaching message: tell them exactly what to do for this step, offer to help, and suggest a concrete action. Be warm but direct. 2-3 sentences max.`,
        true
      );
    }
  }, [open, hasGreeted, messages.length, currentDay, currentStep, sendToAI]);

  useEffect(() => {
    if (prevStepRef.current !== currentStep && open && messages.length > 0) {
      prevStepRef.current = currentStep;
      // Reset execution mode when step changes
      setExecutionMode(false);
      setExecutionPlan(null);
      setCurrentMicroStep(0);
      sendToAI(
        `[SYSTEM] The user moved to a new step: "${currentStep}". Give a brief, proactive coaching message for this step. What should they do? Offer to help. 2 sentences max.`,
        true
      );
    }
  }, [currentStep, open, messages.length, sendToAI]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput("");
    await sendToAI(userMessage);
  }

  function handleQuickAction(actionKey: string) {
    if (loading) return;
    const prompt = t(`mentor.quick_${actionKey}`);
    setInput("");
    sendToAI(prompt);
  }

  // Execution mode functions
  async function startExecutionMode() {
    setExecutionMode(true);
    setExecutionLoading(true);
    setCurrentMicroStep(0);
    setExecutionPlan(null);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_day: currentDay,
          current_step: currentStep,
          current_step_desc: currentStepDesc,
          mission_title: missionTitle,
          user_message: `Break this step into micro-actions: "${currentStep}"`,
          user_responses: userResponses,
          is_execution_mode: true,
          history: [],
        }),
      });

      const data = await res.json();
      const plan = parseExecutionPlan(data.response || "", currentStep);
      setExecutionPlan(plan);
    } catch {
      setExecutionMode(false);
    } finally {
      setExecutionLoading(false);
    }
  }

  function handleMicroStepDone() {
    if (!executionPlan) return;

    if (currentMicroStep < executionPlan.actions.length - 1) {
      setCurrentMicroStep((prev) => prev + 1);
    } else {
      // All micro-steps completed
      setExecutionMode(false);
      setExecutionPlan(null);
      setCurrentMicroStep(0);
      onStepExecuted?.();
    }
  }

  function exitExecutionMode() {
    setExecutionMode(false);
    setExecutionPlan(null);
    setCurrentMicroStep(0);
  }

  function handleNeedHelp() {
    if (!executionPlan) return;
    const action = executionPlan.actions[currentMicroStep];
    exitExecutionMode();
    sendToAI(
      `I need help with this micro-action: "${action.instruction}". I'm on step "${currentStep}". Can you explain in more detail what I should do?`
    );
  }

  const quickActions = [
    { key: "help_step", icon: "💡" },
    { key: "generate", icon: "✨" },
    { key: "stuck", icon: "🆘" },
  ];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center text-2xl transition-transform duration-200 hover:scale-110"
        style={{
          background: "var(--accent)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-glow), var(--shadow-lg)",
        }}
        title={t("mentor.title")}
      >
        🤖
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 flex w-80 flex-col overflow-hidden sm:w-96"
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border-hover)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        height: "480px",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: executionMode
            ? "linear-gradient(135deg, #059669, #10b981)"
            : "linear-gradient(135deg, var(--accent), #6d28d9)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">
            {executionMode ? t("mentor.execution_title") : t("mentor.title")}
          </span>
          {executionMode && executionPlan && (
            <span
              className="px-1.5 py-0.5 text-xs font-bold"
              style={{
                background: "rgba(255,255,255,0.25)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {currentMicroStep + 1}/{executionPlan.actions.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setOpen(false)}
          className="flex h-6 w-6 items-center justify-center text-sm text-white/80 transition-colors hover:text-white"
          style={{
            background: "rgba(255,255,255,0.15)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          ✕
        </button>
      </div>

      {/* Context bar */}
      <div
        className="px-4 py-2 text-xs"
        style={{
          background: "var(--bg-card)",
          color: "var(--text-muted)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {t("common.day")} {currentDay} · {currentStep}
      </div>

      {/* EXECUTION MODE VIEW */}
      {executionMode ? (
        <div className="flex flex-1 flex-col">
          {executionLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
              <div
                className="h-8 w-8 animate-spin"
                style={{
                  border: "3px solid var(--border)",
                  borderTopColor: "var(--success)",
                  borderRadius: "50%",
                }}
              />
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                {t("mentor.execution_loading")}
              </div>
            </div>
          ) : executionPlan ? (
            <>
              {/* Progress dots */}
              <div className="flex items-center justify-center gap-2 px-4 py-3">
                {executionPlan.actions.map((_, i) => (
                  <div
                    key={i}
                    className="h-2 flex-1 transition-all duration-300"
                    style={{
                      background:
                        i < currentMicroStep
                          ? "var(--success)"
                          : i === currentMicroStep
                            ? "var(--accent-light)"
                            : "var(--bg-elevated)",
                      borderRadius: "var(--radius-full)",
                    }}
                  />
                ))}
              </div>

              {/* Current micro-action */}
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {(() => {
                  const action = executionPlan.actions[currentMicroStep];
                  return (
                    <div
                      className="flex flex-col gap-3"
                      style={{ animation: "fadeIn 0.3s ease" }}
                    >
                      {/* Action type badge */}
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{ACTION_ICONS[action.type]}</span>
                        <span
                          className="px-2 py-0.5 text-xs font-bold uppercase"
                          style={{
                            background:
                              action.type === "confirm"
                                ? "rgba(34,197,94,0.15)"
                                : "var(--accent-glow)",
                            color:
                              action.type === "confirm"
                                ? "var(--success)"
                                : "var(--accent-light)",
                            borderRadius: "var(--radius-sm)",
                          }}
                        >
                          {t(`mentor.action_${action.type}`)}
                        </span>
                      </div>

                      {/* Instruction */}
                      <div
                        className="text-sm font-medium leading-relaxed"
                        style={{ color: "var(--text)" }}
                      >
                        {action.instruction}
                      </div>

                      {/* Script block (for SAY/WRITE types) */}
                      {action.script && (
                        <div
                          className="p-3 text-sm"
                          style={{
                            background: "var(--bg-card-hover)",
                            border: "1px solid var(--border-hover)",
                            borderRadius: "var(--radius-md)",
                            borderLeft: "3px solid var(--accent)",
                          }}
                        >
                          <div
                            className="mb-1.5 text-xs font-semibold uppercase"
                            style={{ color: "var(--accent-light)" }}
                          >
                            {action.type === "say"
                              ? t("mentor.say_this")
                              : t("mentor.type_this")}
                          </div>
                          <div
                            className="leading-relaxed"
                            style={{ color: "var(--text)" }}
                          >
                            &ldquo;{action.script}&rdquo;
                          </div>
                        </div>
                      )}

                      {/* Completed steps recap */}
                      {currentMicroStep > 0 && (
                        <div className="mt-2">
                          <div
                            className="mb-1.5 text-xs font-medium"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {t("mentor.completed_actions")}
                          </div>
                          {executionPlan.actions.slice(0, currentMicroStep).map((a, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 py-1 text-xs"
                              style={{ color: "var(--success)" }}
                            >
                              <span>✓</span>
                              <span className="line-through opacity-60">
                                {a.instruction.length > 50
                                  ? a.instruction.slice(0, 50) + "..."
                                  : a.instruction}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Action buttons */}
              <div
                className="flex flex-col gap-2 p-3"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <button
                  onClick={handleMicroStepDone}
                  className="w-full py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110"
                  style={{
                    background:
                      currentMicroStep === executionPlan.actions.length - 1
                        ? "var(--success)"
                        : "var(--accent)",
                    borderRadius: "var(--radius-md)",
                    boxShadow:
                      currentMicroStep === executionPlan.actions.length - 1
                        ? "0 0 16px rgba(34,197,94,0.3)"
                        : "var(--shadow-glow)",
                  }}
                >
                  {currentMicroStep === executionPlan.actions.length - 1
                    ? t("mentor.execution_complete")
                    : t("mentor.execution_next")}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleNeedHelp}
                    className="flex-1 py-2 text-xs font-medium transition-all duration-200"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    {t("mentor.need_help")}
                  </button>
                  <button
                    onClick={exitExecutionMode}
                    className="flex-1 py-2 text-xs font-medium transition-all duration-200"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    {t("mentor.exit_execution")}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : (
        /* CHAT MODE VIEW */
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`mb-3 ${msg.role === "user" ? "text-right" : "text-left"}`}
              >
                <div
                  className="inline-block max-w-[85%] px-3 py-2 text-sm whitespace-pre-wrap"
                  style={{
                    background:
                      msg.role === "user" ? "var(--accent)" : "var(--bg-card-hover)",
                    color: msg.role === "user" ? "#fff" : "var(--text)",
                    borderRadius:
                      msg.role === "user"
                        ? "var(--radius-md) var(--radius-md) var(--radius-sm) var(--radius-md)"
                        : "var(--radius-md) var(--radius-md) var(--radius-md) var(--radius-sm)",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="mb-3 text-left">
                <div
                  className="inline-block px-3 py-2 text-sm"
                  style={{
                    background: "var(--bg-card-hover)",
                    color: "var(--text-muted)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  {t("mentor.thinking")}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Execute button + Quick actions */}
          {!loading && (
            <div className="px-3 pb-2">
              {/* Execute mode CTA */}
              <button
                onClick={startExecutionMode}
                className="mb-2 flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110"
                style={{
                  background: "linear-gradient(135deg, #059669, #10b981)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 0 16px rgba(16,185,129,0.2)",
                }}
              >
                <span>⚡</span>
                {t("mentor.execute_step")}
              </button>
              {/* Quick actions */}
              <div className="flex gap-1.5">
                {quickActions.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => handleQuickAction(action.key)}
                    className="flex-1 px-2 py-1.5 text-xs font-medium transition-all duration-200"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    {action.icon} {t(`mentor.quick_${action.key}_label`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex gap-2 p-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("mentor.placeholder")}
              className="flex-1 px-3 py-2 text-sm outline-none transition-all duration-200"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                color: "var(--text)",
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2 text-sm font-medium text-white transition-all duration-200 disabled:opacity-40"
              style={{
                background: "var(--accent)",
                borderRadius: "var(--radius-md)",
              }}
            >
              {t("common.send")}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
