import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Day-specific synthesis instructions
const DAY_SYNTHESIS: Record<number, { artifact: string; instruction: string }> = {
  1: {
    artifact: "Business Concept Document",
    instruction: `Based on the user's answers, create a complete Business Concept Document:
1. **Business Name** — suggest 3 creative names based on their niche
2. **Problem Statement** — refined version of the problem they identified
3. **Target Audience** — detailed persona based on their audience description
4. **Solution** — how their product/service solves the problem
5. **Unique Value Proposition** — one clear sentence
6. **One-Liner Offer** — refined version of their offer
7. **First 5 Potential Customers** — based on their list, add outreach strategy for each
8. **Validation Score** — rate 1-10 how validated this idea is, with reasoning
9. **Next Steps** — 3 concrete actions for tomorrow (Day 2: Build MVP)`,
  },
  2: {
    artifact: "MVP Blueprint",
    instruction: `Based on the user's answers, create an MVP Blueprint:
1. **MVP Scope** — what to build and what NOT to build
2. **Tech Stack Recommendation** — based on their experience level
3. **Feature List** — prioritized (must-have vs nice-to-have)
4. **Landing Page Structure** — wireframe in text (hero, features, CTA, pricing)
5. **Content Plan** — what content pieces are needed
6. **Deployment Checklist** — step by step to go live
7. **Timeline** — realistic milestones for the next 5 days`,
  },
  3: {
    artifact: "Systems Architecture",
    instruction: `Based on the user's answers, create a Systems Architecture document:
1. **System Overview** — what tools/platforms to use
2. **Automation Opportunities** — what can be automated
3. **Payment Setup** — recommended payment flow
4. **Analytics Setup** — what metrics to track
5. **Email/Notification System** — how to communicate with customers`,
  },
  4: {
    artifact: "Outreach Playbook",
    instruction: `Based on the user's answers, create an Outreach Playbook:
1. **Target List Analysis** — review their contacts and prioritize
2. **Message Templates** — 3 personalized DM templates
3. **Follow-up Sequence** — what to say on days 1, 3, 7
4. **Objection Handling** — top 5 objections and responses
5. **Success Metrics** — what counts as a win this week`,
  },
  5: {
    artifact: "Growth Strategy",
    instruction: `Based on the user's answers, create a Growth Strategy:
1. **Channel Analysis** — which channels to focus on
2. **Content Calendar** — 7-day content plan
3. **Scaling Framework** — how to go from 1 to 10 customers
4. **Partnerships** — potential collaboration opportunities
5. **Automation Roadmap** — what to automate as you scale`,
  },
  6: {
    artifact: "AI Integration Plan",
    instruction: `Based on the user's answers, create an AI Integration Plan:
1. **AI Opportunities** — where AI adds the most value
2. **Tool Recommendations** — specific AI tools for their use case
3. **Automation Flows** — step-by-step automation sequences
4. **Cost Analysis** — expected costs for AI tools
5. **Implementation Priority** — what to automate first`,
  },
  7: {
    artifact: "Launch Checklist & Growth Plan",
    instruction: `Based on the user's answers, create a Launch Checklist:
1. **Pre-Launch Checklist** — everything needed before going public
2. **Launch Day Plan** — hour-by-hour plan
3. **Post-Launch Monitoring** — what to watch for
4. **Week 2 Action Plan** — what to do after the 7 days
5. **30-Day Roadmap** — growth milestones for the first month
6. **Certificate Summary** — achievement summary for their portfolio`,
  },
};

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI is not configured" }, { status: 500 });
  }

  const { day, responses, onboarding, language } = await req.json();

  const synthesis = DAY_SYNTHESIS[day];
  if (!synthesis) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }

  // Format user responses
  const responsesText = Object.entries(responses || {})
    .map(([step, answer]) => `**${step}**: ${answer}`)
    .join("\n");

  // Format onboarding context
  const onboardingText = onboarding
    ? `User Profile:
- Goal: ${onboarding.goal}
- Experience: ${onboarding.experience}
- Time per day: ${onboarding.timePerDay}
- Business idea: ${onboarding.idea || "Discovered during Day 1"}`
    : "";

  const systemPrompt = `You are the VibeCoding AI Strategist. You synthesize a user's daily work into actionable business documents.

The user just completed Day ${day} of a 7-day business building program.
Your task: Create a "${synthesis.artifact}" based on their step-by-step answers.

${onboardingText}

${synthesis.instruction}

RULES:
- Be specific to THEIR business, not generic advice
- Use their exact words and ideas, but refine and structure them
- Make it feel like a professional consultant prepared this
- Include actionable items they can execute immediately
- Format with clear headers and bullet points
- If their answers are vague, make reasonable assumptions and note them

LANGUAGE: Respond in ${language === "ru" ? "Russian" : "English"}.

Return ONLY valid JSON with this structure:
{
  "artifact_title": "${synthesis.artifact}",
  "sections": [
    {
      "title": "Section title",
      "content": "Section content with markdown formatting"
    }
  ],
  "key_insights": ["insight 1", "insight 2", "insight 3"],
  "action_items": ["action 1", "action 2", "action 3"],
  "confidence_score": 85,
  "next_day_preview": "Brief preview of what they'll do tomorrow"
}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Here are my completed steps for Day ${day}:\n\n${responsesText}\n\nPlease synthesize these into my ${synthesis.artifact}.`,
          },
        ],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text;

    if (!text) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const artifact = JSON.parse(cleaned);

    return NextResponse.json({ artifact });
  } catch (error) {
    console.error("Synthesis error:", error);
    return NextResponse.json({ error: "Failed to synthesize" }, { status: 500 });
  }
}
