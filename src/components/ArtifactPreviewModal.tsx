"use client";

import { useEffect, useState } from "react";

interface ArtifactPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  html: string | null;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  downloadFilename?: string;
}

export function ArtifactPreviewModal({
  isOpen,
  onClose,
  html,
  title = "Превью лендинга",
  subtitle = "Сгенерированный лендинг • Tailwind + современный дизайн",
  loading = false,
  downloadFilename = 'landing-page.html',
}: ArtifactPreviewModalProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
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

  const handleCopyHTML = async () => {
    if (!html) return;

    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error("Failed to copy HTML:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = html;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleDownloadHTML = () => {
    if (!html) return;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const handleOpenInNewTab = () => {
    if (!html) return;

    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-[92vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl border"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Premium controls */}
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {subtitle}
              </p>
            </div>

            {/* Desktop / Mobile Toggle */}
            <div className="ml-4 flex items-center gap-1 rounded-xl p-1" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              <button
                onClick={() => setViewMode('desktop')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  viewMode === 'desktop' ? 'shadow-sm' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  background: viewMode === 'desktop' ? 'var(--accent)' : 'transparent',
                  color: viewMode === 'desktop' ? 'white' : 'var(--text)',
                }}
              >
                🖥️ <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                onClick={() => setViewMode('mobile')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  viewMode === 'mobile' ? 'shadow-sm' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  background: viewMode === 'mobile' ? 'var(--accent)' : 'transparent',
                  color: viewMode === 'mobile' ? 'white' : 'var(--text)',
                }}
              >
                📱 <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Copy HTML Button */}
            <button
              onClick={handleCopyHTML}
              disabled={!html}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition active:scale-[0.985] disabled:opacity-50"
              style={{
                background: copied ? "#22c55e22" : "var(--bg-elevated)",
                border: `1px solid ${copied ? "#22c55e44" : "var(--border)"}`,
                color: copied ? "#4ade80" : "var(--text)",
              }}
            >
              {copied ? "✅ Скопировано" : "📋 Скопировать HTML"}
            </button>

            {/* Download HTML Button */}
            <button
              onClick={handleDownloadHTML}
              disabled={!html}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition active:scale-[0.985] disabled:opacity-50"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              💾 Скачать как .html
            </button>

            <button
              onClick={handleOpenInNewTab}
              disabled={!html}
              className="rounded-lg px-4 py-2 text-sm font-medium transition hover:bg-white/5 disabled:opacity-50"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              Открыть в новой вкладке ↗
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

        {/* Preview Area - Adaptive with Device Toggle */}
        <div className="flex-1 overflow-auto bg-[#0a0a0a] p-6">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-[var(--accent)]" />
                <p style={{ color: "var(--text-muted)" }}>Загружаем превью лендинга...</p>
              </div>
            </div>
          ) : html ? (
            <div className="flex h-full items-center justify-center">
              <div
                className={`relative overflow-hidden transition-all duration-300 ${
                  viewMode === 'mobile'
                    ? 'w-[375px] max-w-[375px] h-[667px] rounded-[3rem] border-[12px] border-gray-900 bg-gray-900 shadow-2xl'
                    : 'w-full h-full max-w-none rounded-xl border bg-white'
                }`}
                style={{
                  borderColor: viewMode === 'mobile' ? '#111' : 'var(--border)',
                  boxShadow: viewMode === 'mobile' 
                    ? '0 25px 50px -12px rgb(0 0 0 / 0.4)' 
                    : '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                }}
              >
                {/* Mobile top bar simulation */}
                {viewMode === 'mobile' && (
                  <div className="absolute left-0 right-0 top-0 z-10 h-7 bg-black/90 flex items-center justify-center">
                    <div className="h-1.5 w-16 rounded-full bg-gray-600" />
                  </div>
                )}

                <iframe
                  srcDoc={html}
                  sandbox="allow-scripts allow-same-origin allow-forms"
                  className={`h-full w-full bg-white ${viewMode === 'mobile' ? 'rounded-[2rem]' : 'rounded-xl'}`}
                  style={{ 
                    border: 'none',
                    transform: viewMode === 'mobile' ? 'scale(0.98)' : 'none',
                  }}
                  title={title}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <p className="text-lg font-medium">HTML не найден</p>
                <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                  Артефакт мог быть удалён или ещё не сохранён.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t px-6 py-3 text-center text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          Это изолированный превью. Стили и скрипты работают независимо от приложения.
        </div>
      </div>
    </div>
  );
}
