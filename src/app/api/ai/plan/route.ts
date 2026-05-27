import { NextRequest, NextResponse } from "next/server";
import { guardApiRoute } from "@/lib/auth-guard";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
  const guard = await guardApiRoute();
  if (!guard.ok) return guard.response;

  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI is not configured" },
      { status: 500 }
    );
  }

  const { goal, experience, timePerDay, idea, language } = await req.json();

  const systemPrompt = `You are the VibeCoding AI Planner. You create personalized 7-day business building plans.

Based on the user's profile, generate a detailed 7-day plan where each day has 5-7 actionable steps.
The user will ACTUALLY BUILD a real product/business following your plan.

USER PROFILE:
- Goal: ${goal}
- Experience: ${experience}
- Time per day: ${timePerDay}
- Business idea: ${idea || "No idea yet — suggest one based on their goal"}

RULES:
- Each day must have a clear theme and 5-7 concrete steps
- Steps must be actionable — "Do X" not "Think about X"
- Adapt difficulty to experience level (${experience})
- Adapt scope to available time (${timePerDay})
- If no idea provided, suggest a realistic idea matching their goal
- Day 1 = validation, Day 2 = MVP, Day 3 = systems, Day 4 = outreach, Day 5 = scale, Day 6 = automate, Day 7 = launch
- Each step has a type: "input" (user writes text), "confirm" (check a box), "ai" (AI helps generate something)

Respond with ONLY valid JSON matching this exact structure:
{
  "suggested_idea": "business idea if user didn't provide one, or refined version of their idea",
  "plan_summary": "2-3 sentence overview of the personalized plan",
  "days": [
    {
      "day": 1,
      "title": "Day title",
      "description": "What will be achieved today",
      "steps": [
        {
          "order": 1,
          "title": "Step title",
          "description": "Detailed instructions",
          "type": "input|confirm|ai",
          "skill": "sales|product|content|ai",
          "xp": 10
        }
      ]
    }
  ]
}

LANGUAGE: Respond in ${language === "ru" ? "Russian" : "English"}.`;

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
            content: `Generate my personalized 7-day plan. Goal: ${goal}, Experience: ${experience}, Time: ${timePerDay}, Idea: ${idea || "help me find one"}`,
          },
        ],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse JSON from response (handle potential markdown wrapping)
    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const plan = JSON.parse(cleaned);

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Plan generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}
