"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import en from "@/locales/en.json";
import ru from "@/locales/ru.json";

type Locale = "en" | "ru";

const translations: Record<Locale, Record<string, Record<string, string>>> = { en, ru };

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("vc_lang") as Locale | null;
    if (saved && (saved === "en" || saved === "ru")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("vc_lang", newLocale);
  }, []);

  const t = useCallback(
    (key: string): string => {
      // key format: "section.key" e.g. "onboarding.title"
      const [section, ...rest] = key.split(".");
      const field = rest.join(".");
      return translations[locale]?.[section]?.[field] || key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
