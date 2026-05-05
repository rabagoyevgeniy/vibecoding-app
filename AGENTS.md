# VibeCoding 7D(AI)S — AI Assistant Instructions

## Project Identity

VibeCoding 7D(AI)S is a **"Duolingo for building AI-powered businesses in 7 days"**. Users don't just learn — they BUILD real products (websites, SEO, payments, social media) step by step with an AI mentor. Gamified progression with XP, levels, skills, streaks, and achievements.

## Tech Stack

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS 4
- **State**: React hooks + localStorage (migrating to Supabase)
- **Backend**: Supabase (Auth, PostgreSQL, Realtime)
- **AI**: Anthropic Codex via Next.js API route (`/api/ai`)
- **Vector DB**: Pinecone (`profit-knowledge` index, namespace `vibecoding`, `llama-text-embed-v2`)
- **Payments**: Stripe (via MCP)
- **Deployment**: Vercel (via MCP)
- **SEO**: Ahrefs (via MCP)
- **I18n**: Custom hook-based (EN + RU)

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Landing page (marketing)
│   ├── layout.tsx            # Root layout (I18nProvider)
│   ├── auth/                 # [PLANNED] Login/register
│   ├── onboarding/page.tsx   # Goal selection → dashboard
│   ├── dashboard/page.tsx    # Stats, missions, leads, builder CTA
│   ├── mission/[id]/page.tsx # Day view with steps, AI mentor, side quests
│   ├── builder/page.tsx      # AI build plan generator
│   ├── learning/page.tsx     # Lessons hub (3 categories, 13 lessons)
│   ├── profile/              # [PLANNED] User profile + achievements
│   ├── leaderboard/          # [PLANNED] Weekly competition
│   └── api/
│       └── ai/route.ts       # Codex API proxy (coach + execution mode)
├── components/
│   ├── AIMentor.tsx          # Chat + execution mode overlay
│   ├── StepModal.tsx         # Step completion modal (input/confirm/ai)
│   ├── StepList.tsx          # Step list with checkboxes
│   ├── MissionCard.tsx       # Mission card for dashboard
│   ├── ProgressBar.tsx       # Progress bar
│   ├── SideQuests.tsx        # Bonus quest list
│   ├── SkillsCard.tsx        # 4-skill radar display
│   ├── LevelCard.tsx         # Level + XP progress
│   ├── ShareCard.tsx         # Share progress modal
│   ├── Certificate.tsx       # Completion certificate
│   ├── LeadsList.tsx         # Mini CRM for leads
│   ├── LanguageSwitcher.tsx  # EN/RU toggle
│   ├── MatrixRain.tsx        # Matrix rain animation (landing)
│   ├── AnimatedLogo.tsx      # Animated logo component
│   └── BottomNav.tsx         # [PLANNED] 5-tab navigation
├── lib/
│   ├── missions-data.ts      # 7 days × 5-7 steps (static fallback)
│   ├── learning-data.ts      # 13 lessons in 3 categories
│   ├── levels.ts             # 7 levels: Newbie → System Architect
│   ├── skills.ts             # 4 skills: sales, product, content, ai
│   ├── leads.ts              # Lead CRUD (localStorage)
│   ├── execution-mode.ts     # Micro-action parser for AI execution mode
│   ├── i18n.tsx              # I18n provider + useI18n hook
│   ├── supabase.ts           # Supabase client (configured, unused)
│   ├── types.ts              # Shared types
│   ├── auth.ts               # [PLANNED] Auth context
│   ├── persistence.ts        # [PLANNED] Supabase data layer
│   ├── plan-engine.ts        # [PLANNED] Dynamic plan management
│   ├── streaks.ts            # [PLANNED] Streak tracking
│   ├── hearts.ts             # [PLANNED] Hearts/energy system
│   ├── achievements.ts       # [PLANNED] Achievement system
│   └── pinecone.ts           # [PLANNED] Pinecone client
└── locales/
    ├── en.json               # English translations
    └── ru.json               # Russian translations
```

## Current State (as of 2026-03-21)

### Working
- Landing page (EN only, not translated)
- Onboarding (3 goals: money/startup/ai)
- Dashboard with stats, skills, level, missions
- Mission pages with steps, StepModal, AI Mentor
- Builder page (AI generates build plan)
- Learning hub (13 lessons, 3 categories)
- Gamification: XP (20/step + 50/day), 7 levels, 4 skills, side quests
- Certificate generation (Day 7 completion)
- I18n: EN + RU
- AI Mentor: chat mode + execution mode (micro-actions)

### Not Yet Implemented
- Auth (Supabase)
- Bottom navigation
- Dynamic AI plan generation
- Tool integration (Vercel/Stripe/SEO)
- Pinecone AI memory
- Streaks, hearts, achievements
- Leaderboard
- Profile page
- Landing page i18n

### Data Storage
- **Current**: ALL localStorage (vc_goal, vc_progress, vc_steps_*, vc_response_*, vc_skills, vc_leads, vc_sidequests_*)
- **Target**: Supabase PostgreSQL with RLS

## Gamification System

| Feature | Current | XP |
|---------|---------|-----|
| Complete step | ✅ | +20 |
| Complete day | ✅ | +50 bonus |
| Side quest | ✅ | +15-25 |
| Daily streak | ❌ planned | multiplier |
| Hearts | ❌ planned | skip penalty |
| Achievements | ❌ planned | +10-100 |

### Levels
1. Newbie 🐣 (0-50 XP)
2. Script Kiddie 💻 (50-120 XP)
3. Builder 🔨 (120-220 XP)
4. Hacker 🧑‍💻 (220-350 XP)
5. Operator ⚡ (350-520 XP)
6. Automator 🤖 (520-720 XP)
7. System Architect 👑 (720-1000 XP)

## Key Patterns

- **I18n**: `useI18n()` hook returns `{ t, locale, setLocale }`. All UI text through `t("key")`
- **Design tokens**: CSS variables in `globals.css` (--bg, --text, --accent, etc.)
- **AI API**: POST `/api/ai` with `{ current_day, current_step, mission_title, user_message, history }`
- **Step types**: `input` (text/textarea), `confirm` (checkbox), `ai` (AI-assisted)
- **Execution mode**: AI generates `[DO]`, `[SAY]`, `[CLICK]`, `[WRITE]`, `[CONFIRM]` micro-actions

## Development Rules

- Keep architecture modular
- All text through i18n (no hardcoded strings in components)
- Use CSS variables for colors/spacing (no hardcoded values)
- Mobile-first design (max-w-lg centered)
- Prefer simple, readable TypeScript
- Document complex logic inline

## AI Memory System

Context persists across sessions via triple storage:
1. **Pinecone** (`profit-knowledge` index, namespace `vibecoding`) — vector search for relevant context
2. **AGENTS.md** (this file) — project state and instructions
3. **Notion** — structured documentation and task tracking

## Commit Format

```
feat: add enriched onboarding wizard
fix: resolve XP calculation on step undo
refactor: migrate localStorage to Supabase persistence
```
