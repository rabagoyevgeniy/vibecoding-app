"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { CATEGORIES, LESSONS, type LearningCategory, type Lesson } from "@/lib/learning-data";

function LessonCard({ lesson, isOpen, onToggle }: { lesson: Lesson; isOpen: boolean; onToggle: () => void }) {
  const { t } = useI18n();

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${isOpen ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        transition: "border-color 0.2s",
      }}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="text-xl">{lesson.icon}</span>
        <span className="flex-1 text-sm font-semibold">{t(lesson.titleKey)}</span>
        <span
          className="text-xs transition-transform duration-200"
          style={{
            color: "var(--text-muted)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4" style={{ animation: "fadeIn 0.2s ease-out" }}>
          {/* Explanation */}
          <div className="mb-3">
            <div className="mb-1 text-xs font-semibold uppercase" style={{ color: "var(--text-muted)" }}>
              {t("learning.label_explanation")}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
              {t(lesson.explanationKey)}
            </p>
          </div>

          {/* Example */}
          <div
            className="mb-3 rounded-lg p-3"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            <div className="mb-1 text-xs font-semibold uppercase" style={{ color: "var(--accent-light)" }}>
              {t("learning.label_example")}
            </div>
            <p className="text-sm italic leading-relaxed" style={{ color: "var(--text)" }}>
              {t(lesson.exampleKey)}
            </p>
          </div>

          {/* Actionable Tip */}
          <div
            className="flex items-start gap-2 rounded-lg p-3"
            style={{ background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)" }}
          >
            <span className="text-sm">💡</span>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase" style={{ color: "var(--success)" }}>
                {t("learning.label_tip")}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
                {t(lesson.tipKey)}
              </p>
            </div>
          </div>

          {/* Linked days */}
          <div className="mt-3 flex flex-wrap gap-1">
            {lesson.linkedDays.map((day) => (
              <Link
                key={day}
                href={`/mission/${day}`}
                className="rounded-full px-2 py-0.5 text-xs font-medium transition-colors hover:brightness-110"
                style={{ background: "var(--accent-glow)", color: "var(--accent-light)" }}
              >
                {t("common.day")} {day}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LearningPage() {
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = useState<LearningCategory>("basics");
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);

  const filteredLessons = LESSONS.filter((l) => l.category === activeCategory);

  return (
    <div className="mx-auto max-w-lg p-6">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        {t("common.back_dashboard")}
      </Link>

      <h1 className="mb-2 text-2xl font-bold">
        📚 {t("learning.title")}
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
        {t("learning.subtitle")}
      </p>

      {/* Category tabs */}
      <div className="mb-6 flex gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveCategory(cat.id);
              setOpenLessonId(null);
            }}
            className="flex-1 rounded-xl px-3 py-2.5 text-center text-xs font-semibold transition-all duration-200"
            style={{
              background: activeCategory === cat.id ? "var(--accent)" : "var(--bg-card)",
              color: activeCategory === cat.id ? "#fff" : "var(--text-muted)",
              border: `1px solid ${activeCategory === cat.id ? "var(--accent)" : "var(--border)"}`,
            }}
          >
            <span className="mr-1">{cat.icon}</span>
            {t(cat.titleKey)}
          </button>
        ))}
      </div>

      {/* Lessons list */}
      <div className="flex flex-col gap-3">
        {filteredLessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            isOpen={openLessonId === lesson.id}
            onToggle={() => setOpenLessonId(openLessonId === lesson.id ? null : lesson.id)}
          />
        ))}
      </div>
    </div>
  );
}
