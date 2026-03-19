export interface StepInteraction {
  type: "input" | "confirm" | "ai";
  promptKey: string;
  inputCount?: number;
  placeholderKey?: string;
}

export type SkillType = "sales" | "product" | "content" | "ai";

export interface MissionStep {
  titleKey: string;
  descKey: string;
  interaction: StepInteraction;
  skill: SkillType;
}

export interface SideQuest {
  titleKey: string;
  skill: SkillType;
  xp: number;
}

export interface Mission {
  day: number;
  titleKey: string;
  descKey: string;
  steps: MissionStep[];
  sideQuests: SideQuest[];
}

export const MISSIONS: Mission[] = [
  // DAY 1: FIND YOUR IDEA
  {
    day: 1,
    titleKey: "missions.day1_title",
    descKey: "missions.day1_desc",
    steps: [
      { titleKey: "missions.day1_step1", descKey: "missions.day1_step1_desc", skill: "product", interaction: { type: "input", promptKey: "missions.day1_step1_prompt", placeholderKey: "missions.day1_step1_placeholder" } },
      { titleKey: "missions.day1_step2", descKey: "missions.day1_step2_desc", skill: "product", interaction: { type: "input", promptKey: "missions.day1_step2_prompt", inputCount: 3, placeholderKey: "missions.day1_step2_placeholder" } },
      { titleKey: "missions.day1_step3", descKey: "missions.day1_step3_desc", skill: "product", interaction: { type: "input", promptKey: "missions.day1_step3_prompt", placeholderKey: "missions.day1_step3_placeholder" } },
      { titleKey: "missions.day1_step4", descKey: "missions.day1_step4_desc", skill: "ai", interaction: { type: "ai", promptKey: "missions.day1_step4_prompt" } },
      { titleKey: "missions.day1_step5", descKey: "missions.day1_step5_desc", skill: "product", interaction: { type: "input", promptKey: "missions.day1_step5_prompt", placeholderKey: "missions.day1_step5_placeholder" } },
      { titleKey: "missions.day1_step6", descKey: "missions.day1_step6_desc", skill: "sales", interaction: { type: "input", promptKey: "missions.day1_step6_prompt", inputCount: 5, placeholderKey: "missions.day1_step6_placeholder" } },
    ],
    sideQuests: [
      { titleKey: "side_quests.day1_sq1", skill: "product", xp: 15 },
      { titleKey: "side_quests.day1_sq2", skill: "ai", xp: 15 },
    ],
  },
  // DAY 2: BUILD YOUR MVP
  {
    day: 2,
    titleKey: "missions.day2_title",
    descKey: "missions.day2_desc",
    steps: [
      { titleKey: "missions.day2_step1", descKey: "missions.day2_step1_desc", skill: "product", interaction: { type: "input", promptKey: "missions.day2_step1_prompt", placeholderKey: "missions.day2_step1_placeholder" } },
      { titleKey: "missions.day2_step2", descKey: "missions.day2_step2_desc", skill: "product", interaction: { type: "confirm", promptKey: "missions.day2_step2_prompt" } },
      { titleKey: "missions.day2_step3", descKey: "missions.day2_step3_desc", skill: "product", interaction: { type: "input", promptKey: "missions.day2_step3_prompt", placeholderKey: "missions.day2_step3_placeholder" } },
      { titleKey: "missions.day2_step4", descKey: "missions.day2_step4_desc", skill: "content", interaction: { type: "ai", promptKey: "missions.day2_step4_prompt" } },
      { titleKey: "missions.day2_step5", descKey: "missions.day2_step5_desc", skill: "product", interaction: { type: "input", promptKey: "missions.day2_step5_prompt", placeholderKey: "missions.day2_step5_placeholder" } },
      { titleKey: "missions.day2_step6", descKey: "missions.day2_step6_desc", skill: "product", interaction: { type: "confirm", promptKey: "missions.day2_step6_prompt" } },
      { titleKey: "missions.day2_step7", descKey: "missions.day2_step7_desc", skill: "product", interaction: { type: "confirm", promptKey: "missions.day2_step7_prompt" } },
    ],
    sideQuests: [
      { titleKey: "side_quests.day2_sq1", skill: "product", xp: 15 },
      { titleKey: "side_quests.day2_sq2", skill: "ai", xp: 15 },
    ],
  },
  // DAY 3: SET UP YOUR SYSTEM
  {
    day: 3,
    titleKey: "missions.day3_title",
    descKey: "missions.day3_desc",
    steps: [
      { titleKey: "missions.day3_step1", descKey: "missions.day3_step1_desc", skill: "product", interaction: { type: "input", promptKey: "missions.day3_step1_prompt", placeholderKey: "missions.day3_step1_placeholder" } },
      { titleKey: "missions.day3_step2", descKey: "missions.day3_step2_desc", skill: "product", interaction: { type: "input", promptKey: "missions.day3_step2_prompt", placeholderKey: "missions.day3_step2_placeholder" } },
      { titleKey: "missions.day3_step3", descKey: "missions.day3_step3_desc", skill: "product", interaction: { type: "confirm", promptKey: "missions.day3_step3_prompt" } },
      { titleKey: "missions.day3_step4", descKey: "missions.day3_step4_desc", skill: "product", interaction: { type: "input", promptKey: "missions.day3_step4_prompt", placeholderKey: "missions.day3_step4_placeholder" } },
      { titleKey: "missions.day3_step5", descKey: "missions.day3_step5_desc", skill: "product", interaction: { type: "confirm", promptKey: "missions.day3_step5_prompt" } },
      { titleKey: "missions.day3_step6", descKey: "missions.day3_step6_desc", skill: "product", interaction: { type: "confirm", promptKey: "missions.day3_step6_prompt" } },
    ],
    sideQuests: [
      { titleKey: "side_quests.day3_sq1", skill: "product", xp: 15 },
      { titleKey: "side_quests.day3_sq2", skill: "sales", xp: 15 },
    ],
  },
  // DAY 4: GET YOUR FIRST CLIENT
  {
    day: 4,
    titleKey: "missions.day4_title",
    descKey: "missions.day4_desc",
    steps: [
      { titleKey: "missions.day4_step1", descKey: "missions.day4_step1_desc", skill: "sales", interaction: { type: "input", promptKey: "missions.day4_step1_prompt", inputCount: 5, placeholderKey: "missions.day4_step1_placeholder" } },
      { titleKey: "missions.day4_step2", descKey: "missions.day4_step2_desc", skill: "content", interaction: { type: "ai", promptKey: "missions.day4_step2_prompt" } },
      { titleKey: "missions.day4_step3", descKey: "missions.day4_step3_desc", skill: "content", interaction: { type: "ai", promptKey: "missions.day4_step3_prompt" } },
      { titleKey: "missions.day4_step4", descKey: "missions.day4_step4_desc", skill: "sales", interaction: { type: "input", promptKey: "missions.day4_step4_prompt", inputCount: 3, placeholderKey: "missions.day4_step4_placeholder" } },
      { titleKey: "missions.day4_step5", descKey: "missions.day4_step5_desc", skill: "sales", interaction: { type: "confirm", promptKey: "missions.day4_step5_prompt" } },
      { titleKey: "missions.day4_step6", descKey: "missions.day4_step6_desc", skill: "content", interaction: { type: "input", promptKey: "missions.day4_step6_prompt", placeholderKey: "missions.day4_step6_placeholder" } },
    ],
    sideQuests: [
      { titleKey: "side_quests.day4_sq1", skill: "content", xp: 15 },
      { titleKey: "side_quests.day4_sq2", skill: "sales", xp: 20 },
    ],
  },
  // DAY 5: SCALE YOUR OUTREACH
  {
    day: 5,
    titleKey: "missions.day5_title",
    descKey: "missions.day5_desc",
    steps: [
      { titleKey: "missions.day5_step1", descKey: "missions.day5_step1_desc", skill: "sales", interaction: { type: "input", promptKey: "missions.day5_step1_prompt", placeholderKey: "missions.day5_step1_placeholder" } },
      { titleKey: "missions.day5_step2", descKey: "missions.day5_step2_desc", skill: "ai", interaction: { type: "ai", promptKey: "missions.day5_step2_prompt" } },
      { titleKey: "missions.day5_step3", descKey: "missions.day5_step3_desc", skill: "content", interaction: { type: "input", promptKey: "missions.day5_step3_prompt", placeholderKey: "missions.day5_step3_placeholder" } },
      { titleKey: "missions.day5_step4", descKey: "missions.day5_step4_desc", skill: "sales", interaction: { type: "input", promptKey: "missions.day5_step4_prompt", placeholderKey: "missions.day5_step4_placeholder" } },
      { titleKey: "missions.day5_step5", descKey: "missions.day5_step5_desc", skill: "sales", interaction: { type: "input", promptKey: "missions.day5_step5_prompt", inputCount: 3, placeholderKey: "missions.day5_step5_placeholder" } },
      { titleKey: "missions.day5_step6", descKey: "missions.day5_step6_desc", skill: "content", interaction: { type: "input", promptKey: "missions.day5_step6_prompt", placeholderKey: "missions.day5_step6_placeholder" } },
      { titleKey: "missions.day5_step7", descKey: "missions.day5_step7_desc", skill: "sales", interaction: { type: "input", promptKey: "missions.day5_step7_prompt", placeholderKey: "missions.day5_step7_placeholder" } },
    ],
    sideQuests: [
      { titleKey: "side_quests.day5_sq1", skill: "content", xp: 15 },
      { titleKey: "side_quests.day5_sq2", skill: "sales", xp: 20 },
    ],
  },
  // DAY 6: ADD AI & AUTOMATE
  {
    day: 6,
    titleKey: "missions.day6_title",
    descKey: "missions.day6_desc",
    steps: [
      { titleKey: "missions.day6_step1", descKey: "missions.day6_step1_desc", skill: "ai", interaction: { type: "input", promptKey: "missions.day6_step1_prompt", placeholderKey: "missions.day6_step1_placeholder" } },
      { titleKey: "missions.day6_step2", descKey: "missions.day6_step2_desc", skill: "ai", interaction: { type: "confirm", promptKey: "missions.day6_step2_prompt" } },
      { titleKey: "missions.day6_step3", descKey: "missions.day6_step3_desc", skill: "ai", interaction: { type: "confirm", promptKey: "missions.day6_step3_prompt" } },
      { titleKey: "missions.day6_step4", descKey: "missions.day6_step4_desc", skill: "ai", interaction: { type: "input", promptKey: "missions.day6_step4_prompt", placeholderKey: "missions.day6_step4_placeholder" } },
      { titleKey: "missions.day6_step5", descKey: "missions.day6_step5_desc", skill: "ai", interaction: { type: "confirm", promptKey: "missions.day6_step5_prompt" } },
    ],
    sideQuests: [
      { titleKey: "side_quests.day6_sq1", skill: "ai", xp: 20 },
      { titleKey: "side_quests.day6_sq2", skill: "content", xp: 15 },
    ],
  },
  // DAY 7: LAUNCH & SCALE
  {
    day: 7,
    titleKey: "missions.day7_title",
    descKey: "missions.day7_desc",
    steps: [
      { titleKey: "missions.day7_step1", descKey: "missions.day7_step1_desc", skill: "content", interaction: { type: "ai", promptKey: "missions.day7_step1_prompt" } },
      { titleKey: "missions.day7_step2", descKey: "missions.day7_step2_desc", skill: "sales", interaction: { type: "input", promptKey: "missions.day7_step2_prompt", inputCount: 3, placeholderKey: "missions.day7_step2_placeholder" } },
      { titleKey: "missions.day7_step3", descKey: "missions.day7_step3_desc", skill: "ai", interaction: { type: "confirm", promptKey: "missions.day7_step3_prompt" } },
      { titleKey: "missions.day7_step4", descKey: "missions.day7_step4_desc", skill: "product", interaction: { type: "confirm", promptKey: "missions.day7_step4_prompt" } },
      { titleKey: "missions.day7_step5", descKey: "missions.day7_step5_desc", skill: "product", interaction: { type: "input", promptKey: "missions.day7_step5_prompt", placeholderKey: "missions.day7_step5_placeholder" } },
    ],
    sideQuests: [
      { titleKey: "side_quests.day7_sq1", skill: "content", xp: 20 },
      { titleKey: "side_quests.day7_sq2", skill: "sales", xp: 25 },
    ],
  },
];
