# Nexus Engine v2.0 — Technical Architecture Plan

**Project:** VibeCoding 7D(AI)S (7dais.com)  
**Phase:** 2 — AI Engine Modernization (Nexus)  
**Date:** 2026-05-21  
**Status:** Design Phase (Implementation deferred)  
**Owner:** Grok (autonomous design)

---

## 1. Executive Summary

The current `ai-factory` engine (located at `E:\Projects\ALL VIBECODING PROJECTS\ai-factory`) is a solid proof-of-concept but has fundamental limitations for production use in a Duolingo-style business builder:

- **Limited action space**: Only ~11 generic file/CRUD actions (read/write/update/list files, basic client CRUD).
- **Brittle planning**: Heavy reliance on regex-based intent detection in `planValidator.js`.
- **Outdated AI integration**: Originally built around Gemini-style structured output instead of native tool calling.
- **Poor memory**: Flat `memory.json` file — no persistence across sessions, no user isolation, no semantic search.
- **No business domain awareness**: The engine is generic "code agent", not a "7-day AI business mentor".

**Goal of Nexus v2.0**: Transform the engine into a **domain-specific, Claude-native autonomous agent** deeply integrated into the VibeCoding experience, capable of guiding users through real business building tasks (business model, landing page, lead generation, content, etc.) with strong safety and Human-in-the-Loop controls.

---

## 2. Current State Analysis (ai-factory Audit)

### 2.1 Core Architecture (as of audit)

| Component            | File Path                                      | Role                                      | Weaknesses |
|----------------------|------------------------------------------------|-------------------------------------------|----------|
| **Main Orchestrator**| `agents/agent.js`                              | `runAgent()` — planning + validation + execution | Tightly coupled to old handlers |
| **Execution Loop**   | `agents/src/lib/executionEngine.js`            | `runAutoLoop()` — while loop with guards, handler dispatch, replanning | Good safety (maxSteps, duplicate detection), but no tool schema |
| **Validator**        | `agents/src/lib/planValidator.js`              | Regex intent detection + whitelist        | Extremely brittle, language-specific (RU/EN mix), hard to extend |
| **Memory**           | `agents/src/lib/memoryService.js` + `memory.json` | Flat JSON state                           | No multi-user, no persistence, no querying |
| **AI Service**       | `agents/src/lib/aiService.js`                  | Planning + replanning                     | Old Gemini-style prompting |
| **Tools/Handlers**   | Injected in `agent.js` (11 actions)            | File ops + basic CRUD                     | Not business-oriented |

### 2.2 `runAutoLoop` Cycle (Current)

```
while (true) {
  1. Guard checks (maxSteps, infinite loop, task status)
  2. Get next step from task.plan
  3. Lookup handler by action name (string match)
  4. Execute handler(step.input)
  5. updateMemoryAfterStep + saveMemory
  6. Optional replan on failure (via replanFn)
}
```

**Strengths**: Deterministic safety, timeline for UI, callbacks.
**Weaknesses**: No native tool definitions, no parallel execution, no confirmation hooks.

---

## 3. Target Architecture — Nexus v2.0

### 3.1 High-Level Principles

- **Claude-first**: Use Anthropic Claude 3.5 Sonnet (or Opus) with **native Tool Use** (`tools` parameter + `tool_use` blocks).
- **Domain-specific**: Tools should map directly to 7-day curriculum milestones.
- **Hybrid Memory**: Supabase as primary persistent store + future vector layer.
- **Human-in-the-Loop (HITL)**: Critical actions require explicit user approval in the UI.
- **Progressive Autonomy**: Start with high confirmation, gradually reduce as user levels up.
- **Co-location**: Engine lives inside `vibecoding-app` (no separate backend for core logic).

### 3.2 Recommended Folder Structure

```bash
src/lib/nexus/
├── index.ts                          # Public API exports
├── types.ts                          # Core interfaces (NexusTask, ToolDefinition, etc.)
├── NexusEngine.ts                    # Main class (plan → validate → execute)
│
├── tools/                            # Business tool definitions + implementations
│   ├── index.ts
│   ├── base.ts                       # BaseTool abstract class
│   ├── business/
│   │   ├── businessModelGenerator.ts # Day 1
│   │   ├── valuePropositionBuilder.ts
│   │   └── pricingStrategyTool.ts
│   ├── web/
│   │   ├── siteLayoutBuilder.ts      # Day 3
│   │   ├── landingPageGenerator.ts
│   │   └── seoOptimizer.ts
│   ├── leads/
│   │   ├── leadExtractor.ts
│   │   └── outreachMessageGenerator.ts
│   ├── content/
│   │   ├── socialPostGenerator.ts
│   │   └── emailSequenceBuilder.ts
│   └── system/
│       ├── projectAnalyzer.ts
│       └── progressReporter.ts
│
├── memory/
│   ├── NexusMemoryProvider.ts        # Interface
│   ├── SupabaseMemoryProvider.ts     # Primary implementation
│   └── VectorMemoryProvider.ts       # Future (Pinecone)
│
├── validation/
│   └── NexusPlanValidator.ts         # Post-tool-call safety + business rules
│
├── execution/
│   ├── StepExecutor.ts
│   └── HITLManager.ts                # Human confirmation logic
│
├── prompts/
│   ├── system/
│   │   └── nexusSystemPrompt.ts      # Main system prompt with tool descriptions
│   └── fewshot/
│       └── day1-business-model.ts
│
└── utils/
    └── toolSchemaConverter.ts        # Convert TS tool defs → Anthropic format
```

### 3.3 Core Execution Cycle (Nexus v2.0)

```
User Message (or daily mission trigger)
          │
          ▼
┌─────────────────────┐
│   1. PLAN           │  ← Claude with full tool list + user context + memory
│   (Claude Sonnet)   │     Returns structured tool_calls or text plan
└─────────────────────┘
          │
          ▼
┌─────────────────────┐
│   2. VALIDATE       │  ← NexusPlanValidator (deterministic + business rules)
│   (Safety Layer)    │     + HITL decision points
└─────────────────────┘
          │
          ▼
┌─────────────────────┐
│   3. EXECUTE        │  ← StepExecutor with confirmation hooks
│   (with HITL)       │     Update Supabase progress in real-time
└─────────────────────┘
          │
          ▼
┌─────────────────────┐
│   4. REFLECT &      │  ← Update memory, skills, XP, user_progress
│      PERSIST        │     Trigger UI notifications / next mission unlock
└─────────────────────┘
```

---

## 4. Key Technical Decisions

### 4.1 AI Provider Migration

- **Primary Model**: `claude-3-5-sonnet-20241022` (or latest Sonnet)
- **SDK**: `@anthropic-ai/sdk`
- **Tool Calling**: Native `tools` array + `tool_choice: "auto"`
- **Benefits over old approach**:
  - No more fragile regex parsing of AI output
  - Parallel tool calling supported
  - Better reasoning about business context
  - Built-in refusal handling

### 4.2 Memory Strategy (Hybrid)

**Phase A (Immediate)**:
- Use existing tables: `user_progress`, `user_step_responses`, `user_step_completions`, `user_leads`, `user_artifacts`
- New tables (recommended):
  - `nexus_sessions` (user_id, day, goal, status, created_at)
  - `nexus_tool_calls` (session_id, tool_name, input, output, status, approved_by_user)
  - `nexus_reflections` (free-form agent thoughts)

**Phase B (Later)**:
- Semantic memory via Pinecone (`profit-knowledge` index, namespace `nexus` or per-user)

### 4.3 Proposed High-Value Tools (Examples)

| Tool Name                      | Day | Purpose                                      | Risk Level | Requires Confirmation? |
|--------------------------------|-----|----------------------------------------------|------------|------------------------|
| `generate_business_model`      | 1   | Business Model Canvas + validation           | Medium     | Yes (first time)       |
| `build_site_layout`            | 3   | Generate Next.js page structure + Tailwind   | High       | Yes                    |
| `extract_leads_from_text`      | 4-5 | Parse user input into structured leads       | Low        | No                     |
| `generate_outreach_sequence`   | 5   | Cold email / DM sequence for specific lead   | Medium     | Yes                    |
| `create_content_calendar`      | 6   | 7-day social/content plan                    | Low        | Optional               |
| `analyze_competitor_landing`   | 2-3 | Scrape + analyze competitor page             | Medium     | Yes (if external)      |
| `suggest_pricing_tiers`        | 1   | Pricing strategy based on value prop         | Low        | No                     |

### 4.4 Human-in-the-Loop (HITL) Design

- **Level 0** (Safe): Pure analysis / generation of suggestions
- **Level 1** (Medium): Creating documents, lead lists, content drafts → show preview + "Apply" button
- **Level 2** (High): Writing files to user's project, sending real messages → explicit confirmation modal

The existing `AIMentor` component already has an "execution mode" overlay — Nexus should feed into it.

---

## 5. Integration Points with Existing Codebase

- Reuse `useAuth()` + Supabase client from `supabase-browser.ts`
- Extend `/api/ai` route or create dedicated `/api/nexus` route for tool-enabled calls
- Deep integration with `AIMentor.tsx` (the chat + execution UI)
- Progress system (`user_progress`, skills, XP) updated after successful tool execution
- Daily mission steps can trigger specific Nexus tools

---

## 6. Migration & Rollout Strategy

1. **Phase 2.1** — Create `src/lib/nexus/` skeleton + TypeScript types + one pilot tool (`businessModelGenerator`)
2. **Phase 2.2** — Implement `NexusEngine` class with Claude tool calling
3. **Phase 2.3** — Connect to existing `AIMentor` execution mode
4. **Phase 2.4** — Migrate 3–4 high-value tools from old ai-factory + new business ones
5. **Phase 2.5** — Add Supabase memory provider + sync on login
6. **Phase 2.6** — Full HITL UI flows + safety validator

Old `ai-factory` remains as reference / fallback during transition.

---

## 7. Risks & Mitigations

| Risk                        | Mitigation |
|----------------------------|----------|
| Claude tool calling hallucinations | Strong system prompt + post-validation layer + HITL |
| Cost explosion               | Token budgeting, caching of similar plans, user quotas |
| Security (tools writing files) | Sandboxed execution + user approval gates |
| Over-automation              | Explicit "Autonomy Level" setting per user |

---

## 8. Next Steps (After Approval)

1. Create `docs/nexus/` with detailed tool specifications
2. Prototype one end-to-end tool (e.g. Day 1 Business Model)
3. Design confirmation UI components
4. Begin implementation inside `src/lib/nexus/`

---

**Document Status**: Ready for review and approval before any implementation begins.

---

*This plan was created autonomously based on full audit of the legacy ai-factory engine on 2026-05-21.*