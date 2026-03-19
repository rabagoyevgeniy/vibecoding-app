export type LearningCategory = "basics" | "ai_models" | "prompting";

export interface Lesson {
  id: string;
  category: LearningCategory;
  titleKey: string;
  explanationKey: string;
  exampleKey: string;
  tipKey: string;
  /** Which mission days this lesson is relevant to */
  linkedDays: number[];
  icon: string;
}

export const CATEGORIES: { id: LearningCategory; titleKey: string; icon: string }[] = [
  { id: "basics", titleKey: "learning.cat_basics", icon: "📘" },
  { id: "ai_models", titleKey: "learning.cat_ai_models", icon: "🤖" },
  { id: "prompting", titleKey: "learning.cat_prompting", icon: "✨" },
];

export const LESSONS: Lesson[] = [
  // === BASICS ===
  {
    id: "what-is-ai",
    category: "basics",
    titleKey: "learning.basics_what_is_ai",
    explanationKey: "learning.basics_what_is_ai_exp",
    exampleKey: "learning.basics_what_is_ai_ex",
    tipKey: "learning.basics_what_is_ai_tip",
    linkedDays: [1],
    icon: "🧠",
  },
  {
    id: "mvp-mindset",
    category: "basics",
    titleKey: "learning.basics_mvp",
    explanationKey: "learning.basics_mvp_exp",
    exampleKey: "learning.basics_mvp_ex",
    tipKey: "learning.basics_mvp_tip",
    linkedDays: [2],
    icon: "🚀",
  },
  {
    id: "landing-page-101",
    category: "basics",
    titleKey: "learning.basics_landing",
    explanationKey: "learning.basics_landing_exp",
    exampleKey: "learning.basics_landing_ex",
    tipKey: "learning.basics_landing_tip",
    linkedDays: [2, 3],
    icon: "🌐",
  },
  {
    id: "cold-outreach",
    category: "basics",
    titleKey: "learning.basics_outreach",
    explanationKey: "learning.basics_outreach_exp",
    exampleKey: "learning.basics_outreach_ex",
    tipKey: "learning.basics_outreach_tip",
    linkedDays: [4, 5],
    icon: "📨",
  },
  {
    id: "automation-basics",
    category: "basics",
    titleKey: "learning.basics_automation",
    explanationKey: "learning.basics_automation_exp",
    exampleKey: "learning.basics_automation_ex",
    tipKey: "learning.basics_automation_tip",
    linkedDays: [6],
    icon: "⚙️",
  },

  // === AI MODELS ===
  {
    id: "chatgpt-vs-claude",
    category: "ai_models",
    titleKey: "learning.models_comparison",
    explanationKey: "learning.models_comparison_exp",
    exampleKey: "learning.models_comparison_ex",
    tipKey: "learning.models_comparison_tip",
    linkedDays: [1, 6],
    icon: "⚔️",
  },
  {
    id: "when-to-use-ai",
    category: "ai_models",
    titleKey: "learning.models_when",
    explanationKey: "learning.models_when_exp",
    exampleKey: "learning.models_when_ex",
    tipKey: "learning.models_when_tip",
    linkedDays: [1, 2],
    icon: "🎯",
  },
  {
    id: "ai-for-content",
    category: "ai_models",
    titleKey: "learning.models_content",
    explanationKey: "learning.models_content_exp",
    exampleKey: "learning.models_content_ex",
    tipKey: "learning.models_content_tip",
    linkedDays: [2, 4, 5, 7],
    icon: "✍️",
  },
  {
    id: "ai-for-automation",
    category: "ai_models",
    titleKey: "learning.models_automation",
    explanationKey: "learning.models_automation_exp",
    exampleKey: "learning.models_automation_ex",
    tipKey: "learning.models_automation_tip",
    linkedDays: [6],
    icon: "🔄",
  },

  // === PROMPTING ===
  {
    id: "prompt-structure",
    category: "prompting",
    titleKey: "learning.prompt_structure",
    explanationKey: "learning.prompt_structure_exp",
    exampleKey: "learning.prompt_structure_ex",
    tipKey: "learning.prompt_structure_tip",
    linkedDays: [1, 2],
    icon: "🏗️",
  },
  {
    id: "role-prompting",
    category: "prompting",
    titleKey: "learning.prompt_role",
    explanationKey: "learning.prompt_role_exp",
    exampleKey: "learning.prompt_role_ex",
    tipKey: "learning.prompt_role_tip",
    linkedDays: [2, 4],
    icon: "🎭",
  },
  {
    id: "iteration-prompting",
    category: "prompting",
    titleKey: "learning.prompt_iteration",
    explanationKey: "learning.prompt_iteration_exp",
    exampleKey: "learning.prompt_iteration_ex",
    tipKey: "learning.prompt_iteration_tip",
    linkedDays: [4, 5],
    icon: "🔁",
  },
  {
    id: "chain-of-thought",
    category: "prompting",
    titleKey: "learning.prompt_chain",
    explanationKey: "learning.prompt_chain_exp",
    exampleKey: "learning.prompt_chain_ex",
    tipKey: "learning.prompt_chain_tip",
    linkedDays: [6, 7],
    icon: "🔗",
  },
];

/** Get lessons relevant to a specific mission day */
export function getLessonsForDay(day: number): Lesson[] {
  return LESSONS.filter((l) => l.linkedDays.includes(day));
}
