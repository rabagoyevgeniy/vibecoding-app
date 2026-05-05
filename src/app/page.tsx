"use client";

import Link from "next/link";
import { MatrixRain } from "@/components/MatrixRain";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { useI18n } from "@/lib/i18n";

export default function LandingPage() {
  const { t } = useI18n();

  const DAYS = [
    { day: 1, title: t("landing.day1"), result: t("landing.day1_result") },
    { day: 2, title: t("landing.day2"), result: t("landing.day2_result") },
    { day: 3, title: t("landing.day3"), result: t("landing.day3_result") },
    { day: 4, title: t("landing.day4"), result: t("landing.day4_result") },
    { day: 5, title: t("landing.day5"), result: t("landing.day5_result") },
    { day: 6, title: t("landing.day6"), result: t("landing.day6_result") },
    { day: 7, title: t("landing.day7"), result: t("landing.day7_result") },
  ];

  const RESULTS = [
    { icon: "💬", title: t("landing.res_clients"), desc: t("landing.res_clients_desc") },
    { icon: "🔗", title: t("landing.res_system"), desc: t("landing.res_system_desc") },
    { icon: "🤖", title: t("landing.res_ai"), desc: t("landing.res_ai_desc") },
    { icon: "💰", title: t("landing.res_revenue"), desc: t("landing.res_revenue_desc") },
    { icon: "📊", title: t("landing.res_data"), desc: t("landing.res_data_desc") },
    { icon: "🚀", title: t("landing.res_momentum"), desc: t("landing.res_momentum_desc") },
  ];

  return (
    <div
      className="relative"
      style={{
        background: "var(--bg)",
        color: "var(--text)",
        minHeight: "100vh",
      }}
    >
      <MatrixRain />

      {/* All content above the canvas */}
      <div className="relative z-10">

      {/* HERO */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-8">
          <AnimatedLogo size="lg" />
        </div>

        <div className="mb-6 inline-block rounded-full px-4 py-1.5 text-sm font-medium" style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border)", color: "var(--accent-light)" }}>
          {t("landing.badge")}
        </div>

        <h1 className="mx-auto max-w-3xl text-5xl font-extrabold leading-tight tracking-tight sm:text-7xl">
          {t("landing.hero_1")}
          <br />
          <span style={{ color: "var(--accent)" }}>{t("landing.hero_2")}</span>
          <br />
          {t("landing.hero_3")}
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg" style={{ color: "var(--text-muted)" }}>
          {t("landing.sub_1")}
          <br />
          <strong style={{ color: "var(--text)" }}>7D(AI)S</strong> {t("landing.sub_2")}
        </p>

        <Link
          href="/auth"
          className="mt-10 inline-block rounded-xl px-10 py-4 text-lg font-bold text-white transition-transform hover:scale-105"
          style={{ background: "linear-gradient(135deg, var(--accent), #6d28d9)" }}
        >
          {t("landing.cta")}
        </Link>

        <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
          {t("landing.cta_sub")}
        </p>

        {/* Scroll indicator */}
        <div className="mt-16 animate-bounce" style={{ color: "var(--text-muted)" }}>
          ↓
        </div>
      </section>

      {/* PROBLEM vs SOLUTION */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <h2 className="mb-12 text-center text-3xl font-bold sm:text-4xl">
          {t("landing.problem_title")} <span style={{ color: "var(--text-muted)" }}>{t("landing.problem_title_span")}</span>
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid #2a1a1a" }}>
            <div className="mb-4 text-2xl">😩</div>
            <h3 className="mb-3 text-lg font-bold" style={{ color: "#ef4444" }}>{t("landing.problem_bad")}</h3>
            <ul className="flex flex-col gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <li>{t("landing.bad_1")}</li>
              <li>{t("landing.bad_2")}</li>
              <li>{t("landing.bad_3")}</li>
              <li>{t("landing.bad_4")}</li>
              <li>{t("landing.bad_5")}</li>
            </ul>
          </div>

          <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid rgba(124,58,237,0.3)" }}>
            <div className="mb-4 text-2xl">⚡</div>
            <h3 className="mb-3 text-lg font-bold" style={{ color: "var(--accent-light)" }}>{t("landing.problem_good")}</h3>
            <ul className="flex flex-col gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <li>{t("landing.good_1")}</li>
              <li>{t("landing.good_2")}</li>
              <li>{t("landing.good_3")}</li>
              <li>{t("landing.good_4")}</li>
              <li>{t("landing.good_5")}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">
          {t("landing.how_title_1")}
          <br />
          <span style={{ color: "var(--accent-light)" }}>{t("landing.how_title_2")}</span>
        </h2>
        <p className="mb-12 text-center" style={{ color: "var(--text-muted)" }}>
          {t("landing.how_sub")}
        </p>

        <div className="flex flex-col gap-4">
          {DAYS.map((d) => (
            <div
              key={d.day}
              className="flex items-center gap-4 rounded-xl p-4"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {d.day}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{d.title}</div>
                <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {d.result}
                </div>
              </div>
              <div style={{ color: "var(--success)" }}>✓</div>
            </div>
          ))}
        </div>
      </section>

      {/* RESULTS */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <h2 className="mb-12 text-center text-3xl font-bold sm:text-4xl">
          {t("landing.results_title")}
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          {RESULTS.map((item, i) => (
            <div
              key={i}
              className="rounded-xl p-5 text-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div className="mb-2 text-3xl">{item.icon}</div>
              <div className="mb-1 font-bold">{item.title}</div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 py-24 text-center">
        <div
          className="mx-auto max-w-2xl rounded-2xl p-10"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(109,40,217,0.1))",
            border: "1px solid var(--accent)",
          }}
        >
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            {t("landing.final_1")}
            <br />
            <span style={{ color: "var(--accent-light)" }}>{t("landing.final_2")}</span>
          </h2>
          <p className="mb-8" style={{ color: "var(--text-muted)" }}>
            {t("landing.final_sub")}
          </p>

          <Link
            href="/auth"
            className="inline-block rounded-xl px-10 py-4 text-lg font-bold text-white transition-transform hover:scale-105"
            style={{ background: "linear-gradient(135deg, var(--accent), #6d28d9)" }}
          >
            {t("landing.cta")}
          </Link>

          <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
            {t("landing.final_bottom")}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        {t("landing.footer")}
      </footer>

      </div>{/* end z-10 wrapper */}
    </div>
  );
}
