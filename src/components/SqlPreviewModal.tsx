"use client";

import { useEffect, useState } from "react";

interface SqlPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sql: string | null;
  title?: string;
}

export function SqlPreviewModal({
  isOpen,
  onClose,
  sql,
  title = "SQL-схема базы данных",
}: SqlPreviewModalProps) {
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleCopySQL = async () => {
    if (!sql) return;

    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error("Failed to copy SQL:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = sql;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleDownloadSQL = () => {
    if (!sql) return;

    const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'database-schema.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenSupabase = () => {
    window.open('https://dashboard.supabase.com', '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-[92vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-2xl border"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - VS Code style controls */}
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Supabase PostgreSQL • Готов к выполнению в SQL Editor
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Copy SQL Button */}
            <button
              onClick={handleCopySQL}
              disabled={!sql}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition active:scale-[0.985] disabled:opacity-50"
              style={{
                background: copied ? "#22c55e22" : "var(--bg-elevated)",
                border: `1px solid ${copied ? "#22c55e44" : "var(--border)"}`,
                color: copied ? "#4ade80" : "var(--text)",
              }}
            >
              {copied ? "✅ Скопировано" : "📋 Скопировать SQL-скрипт"}
            </button>

            {/* Open Supabase Button */}
            <button
              onClick={handleOpenSupabase}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition active:scale-[0.985]"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              🌐 Открыть Supabase
            </button>

            {/* Download .sql (bonus, very useful) */}
            <button
              onClick={handleDownloadSQL}
              disabled={!sql}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition active:scale-[0.985] disabled:opacity-50"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              💾 Скачать .sql
            </button>

            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold transition"
              style={{
                background: "var(--accent)",
                color: "white",
              }}
            >
              Закрыть
            </button>
          </div>
        </div>

        {/* Code Editor Area — VS Code style */}
        <div className="flex-1 overflow-hidden flex flex-col bg-[#0f1117]">
          {/* Fake VS Code tab bar */}
          <div 
            className="flex items-center gap-2 px-4 py-2 text-xs border-b font-mono"
            style={{ 
              background: "#1e1e1e", 
              borderColor: "#333",
              color: "#888"
            }}
          >
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-t bg-[#0f1117] border-t border-l border-r" style={{ borderColor: "#333" }}>
              📄 <span>database-schema.sql</span>
            </div>
            <div className="text-[10px] ml-auto opacity-60">PostgreSQL • Supabase</div>
          </div>

          {/* Scrollable SQL content */}
          <div className="flex-1 overflow-auto p-6 font-mono text-sm leading-relaxed text-[#d4d4d4] bg-[#0f1117]">
            {sql ? (
              <pre className="whitespace-pre-wrap break-words m-0">
                <code>{sql}</code>
              </pre>
            ) : (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <p className="text-lg font-medium" style={{ color: "var(--text)" }}>SQL не найден</p>
                  <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                    Артефакт мог быть удалён или генерация ещё не завершена.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div 
          className="border-t px-6 py-3 text-center text-[11px]" 
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          Скопируйте скрипт и выполните его в Supabase SQL Editor → Database → SQL Editor
        </div>
      </div>
    </div>
  );
}
