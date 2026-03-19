import Link from "next/link";
import { MatrixRain } from "@/components/MatrixRain";
import { AnimatedLogo } from "@/components/AnimatedLogo";

const DAYS = [
  { day: 1, title: "Find Your Idea", result: "Problem validated, offer defined" },
  { day: 2, title: "Build Your MVP", result: "Landing page live, ready to share" },
  { day: 3, title: "Set Up Your System", result: "Payments + booking connected" },
  { day: 4, title: "Get Your First Client", result: "3 messages sent, first reply" },
  { day: 5, title: "Scale Your Outreach", result: "Repeatable outreach process" },
  { day: 6, title: "Add AI & Automate", result: "Workflows running on autopilot" },
  { day: 7, title: "Launch & Scale", result: "Public launch, real users" },
];

export default function LandingPage() {
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
          7 days. 1 business. AI-guided.
        </div>

        <h1 className="mx-auto max-w-3xl text-5xl font-extrabold leading-tight tracking-tight sm:text-7xl">
          Build your first
          <br />
          <span style={{ color: "var(--accent)" }}>AI-powered business</span>
          <br />
          in 7 days
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg" style={{ color: "var(--text-muted)" }}>
          Stop watching tutorials. Stop planning. Start building.
          <br />
          <strong style={{ color: "var(--text)" }}>7D(AI)S</strong> gives you a daily mission, an AI mentor, and everything you need to go from zero to paying clients — in one week.
        </p>

        <Link
          href="/onboarding"
          className="mt-10 inline-block rounded-xl px-10 py-4 text-lg font-bold text-white transition-transform hover:scale-105"
          style={{ background: "linear-gradient(135deg, var(--accent), #6d28d9)" }}
        >
          Start Day 1 →
        </Link>

        <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
          Free. No credit card. No fluff.
        </p>

        {/* Scroll indicator */}
        <div className="mt-16 animate-bounce" style={{ color: "var(--text-muted)" }}>
          ↓
        </div>
      </section>

      {/* PROBLEM vs SOLUTION */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <h2 className="mb-12 text-center text-3xl font-bold sm:text-4xl">
          The problem with <span style={{ color: "var(--text-muted)" }}>&quot;learning to build&quot;</span>
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid #2a1a1a" }}>
            <div className="mb-4 text-2xl">😩</div>
            <h3 className="mb-3 text-lg font-bold" style={{ color: "#ef4444" }}>What most people do</h3>
            <ul className="flex flex-col gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <li>Watch 47 YouTube tutorials</li>
              <li>Buy 3 courses they never finish</li>
              <li>Spend months &quot;preparing&quot;</li>
              <li>Build something nobody uses</li>
              <li>Give up and call it &quot;a learning experience&quot;</li>
            </ul>
          </div>

          <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid rgba(124,58,237,0.3)" }}>
            <div className="mb-4 text-2xl">⚡</div>
            <h3 className="mb-3 text-lg font-bold" style={{ color: "var(--accent-light)" }}>What 7D(AI)S does</h3>
            <ul className="flex flex-col gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <li>Day 1: you find and validate your idea</li>
              <li>Day 2: you build a real MVP</li>
              <li>Day 3: you set up payments and systems</li>
              <li>Day 4: you reach out and get clients</li>
              <li>Day 7: you have a running business</li>
            </ul>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">
          7 days. 7 missions.
          <br />
          <span style={{ color: "var(--accent-light)" }}>Real results.</span>
        </h2>
        <p className="mb-12 text-center" style={{ color: "var(--text-muted)" }}>
          Each day is a focused mission with clear steps. Complete them all and you&apos;ll have a working business by Day 7.
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
          By Day 7, you&apos;ll have
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: "💬", title: "Clients", desc: "Real people paying for your service or product" },
            { icon: "🔗", title: "A System", desc: "Landing page → booking → delivery — all connected" },
            { icon: "🤖", title: "AI Tools", desc: "Automations doing the work while you sleep" },
            { icon: "💰", title: "Revenue", desc: "Stripe connected, payments flowing in" },
            { icon: "📊", title: "Data", desc: "You know what works, what doesn't, and what to do next" },
            { icon: "🚀", title: "Momentum", desc: "A business that's live, not stuck in your head" },
          ].map((item, i) => (
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
            Stop planning.
            <br />
            <span style={{ color: "var(--accent-light)" }}>Start building.</span>
          </h2>
          <p className="mb-8" style={{ color: "var(--text-muted)" }}>
            Your AI mentor is ready. Your first mission is waiting. The only thing missing is you hitting the button.
          </p>

          <Link
            href="/onboarding"
            className="inline-block rounded-xl px-10 py-4 text-lg font-bold text-white transition-transform hover:scale-105"
            style={{ background: "linear-gradient(135deg, var(--accent), #6d28d9)" }}
          >
            Start Day 1 →
          </Link>

          <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
            7 days from now, you&apos;ll either have a business — or another week of &quot;I&apos;ll start tomorrow.&quot;
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        7D(AI)S — Build real products with AI guidance
      </footer>

      </div>{/* end z-10 wrapper */}
    </div>
  );
}
