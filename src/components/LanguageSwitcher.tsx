"use client";

import { useI18n } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div
      className="flex gap-1 p-1"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      {(["en", "ru"] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => setLocale(lang)}
          className="px-3 py-1 text-xs font-medium transition-all duration-200"
          style={{
            background: locale === lang ? "var(--accent)" : "transparent",
            color: locale === lang ? "#fff" : "var(--text-muted)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
