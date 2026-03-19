"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { StepInteraction } from "@/lib/missions-data";

interface StepModalProps {
  stepTitle: string;
  interaction: StepInteraction;
  onComplete: (response: string) => void;
  onCancel: () => void;
  initialResponse?: string;
  isEditing?: boolean;
}

export function StepModal({ stepTitle, interaction, onComplete, onCancel, initialResponse, isEditing }: StepModalProps) {
  const { t } = useI18n();

  function parseInitial(): string[] {
    if (!initialResponse) {
      return interaction.inputCount ? Array(interaction.inputCount).fill("") : [""];
    }
    if (interaction.inputCount) {
      const parts = initialResponse.split(" | ");
      const arr = Array(interaction.inputCount).fill("");
      parts.forEach((p, i) => { if (i < arr.length) arr[i] = p; });
      return arr;
    }
    return [initialResponse];
  }

  const [inputs, setInputs] = useState<string[]>(parseInitial);

  const isInput = interaction.type === "input";
  const isAi = interaction.type === "ai";
  const isConfirm = interaction.type === "confirm";

  const prompt = t(interaction.promptKey);
  const placeholder = interaction.placeholderKey ? t(interaction.placeholderKey) : "";

  const canSubmit = isConfirm || isAi
    ? true
    : interaction.inputCount
      ? inputs.some((v) => v.trim())
      : inputs[0]?.trim();

  function handleSubmit() {
    const response = interaction.inputCount
      ? inputs.filter((v) => v.trim()).join(" | ")
      : inputs[0] || "confirmed";
    onComplete(response);
  }

  function updateInput(index: number, value: string) {
    setInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md p-6"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border-hover)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step title */}
        <div className="mb-1 text-xs font-medium" style={{ color: "var(--accent-light)" }}>
          {stepTitle}
        </div>

        {/* Prompt */}
        <p className="mb-5 font-semibold">{prompt}</p>

        {/* Content based on type */}
        {isInput && (
          <div className="mb-5 flex flex-col gap-2">
            {interaction.inputCount ? (
              inputs.map((val, i) => (
                <input
                  key={i}
                  value={val}
                  onChange={(e) => updateInput(i, e.target.value)}
                  placeholder={`${i + 1}. ${placeholder}`}
                  className="w-full px-3 py-2.5 text-sm outline-none transition-all duration-200 focus:border-[var(--accent)]"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text)",
                  }}
                />
              ))
            ) : (
              <textarea
                value={inputs[0]}
                onChange={(e) => updateInput(0, e.target.value)}
                placeholder={placeholder}
                rows={3}
                className="w-full resize-none px-3 py-2.5 text-sm outline-none transition-all duration-200 focus:border-[var(--accent)]"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text)",
                }}
              />
            )}
          </div>
        )}

        {isAi && (
          <div
            className="mb-5 flex items-center gap-3 p-3 text-sm"
            style={{
              background: "var(--bg-card-hover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <span className="text-xl">🤖</span>
            <span style={{ color: "var(--text-muted)" }}>{t("step_modal.ai_hint")}</span>
          </div>
        )}

        {isConfirm && (
          <div
            className="mb-5 flex items-center gap-3 p-3 text-sm"
            style={{
              background: "var(--bg-card-hover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <span className="text-xl">✅</span>
            <span style={{ color: "var(--text-muted)" }}>{t("step_modal.confirm_hint")}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-medium transition-all duration-200"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-muted)",
            }}
          >
            {t("step_modal.cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-2.5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40"
            style={{
              background: "var(--accent)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            {isEditing
              ? t("step_modal.update")
              : isConfirm || isAi
                ? t("step_modal.yes_done")
                : t("step_modal.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
