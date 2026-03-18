import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(req: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { response: "AI is not configured. Add ANTHROPIC_API_KEY to .env.local" },
      { status: 200 }
    );
  }

  const { current_day, current_step, mission_title, user_message, history } =
    await req.json();

  const systemPrompt = `You are an AI mentor for VibeCoding — a 7-day program where users build real products.

Current context:
- Day: ${current_day}/7
- Mission: ${mission_title}
- Current step: ${current_step}

Your personality:
- Direct and practical — no fluff
- You explain things simply, like talking to a smart friend
- You give code examples when relevant
- You debug issues step by step
- You motivate without being cheesy
- Keep responses concise (under 200 words unless code is needed)

Your job:
1. Help the user complete their current step
2. Debug any issues they face
3. Generate code snippets or instructions when asked
4. Suggest next actions

Never refuse to help. Always be constructive. If you don't know something, say so and suggest where to look.`;

  const messages = [
    ...(history || []).map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: user_message },
  ];

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
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await res.json();

    if (data.content?.[0]?.text) {
      return NextResponse.json({ response: data.content[0].text });
    }

    return NextResponse.json({
      response: "Sorry, I couldn't generate a response. Try again.",
    });
  } catch (error) {
    console.error("AI error:", error);
    return NextResponse.json(
      { response: "AI service error. Check your API key and try again." },
      { status: 500 }
    );
  }
}
