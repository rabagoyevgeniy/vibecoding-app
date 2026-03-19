export interface MicroAction {
  instruction: string;
  type: "do" | "say" | "click" | "write" | "confirm";
  script?: string; // exact words to say/write
}

export interface ExecutionPlan {
  stepTitle: string;
  actions: MicroAction[];
}

/**
 * Parse AI response into structured micro-actions.
 * Expected format from AI:
 * [DO] Open your camera app
 * [SAY] "Hey, I built something that helps freelancers find clients..."
 * [CLICK] Press the record button
 * [WRITE] Type your one-line offer in the text field
 * [CONFIRM] Done? Let's move on.
 */
export function parseExecutionPlan(raw: string, stepTitle: string): ExecutionPlan {
  const lines = raw.split("\n").filter((l) => l.trim());
  const actions: MicroAction[] = [];

  for (const line of lines) {
    const match = line.match(/^\[(\w+)\]\s*(.+)/);
    if (!match) continue;

    const tag = match[1].toLowerCase() as MicroAction["type"];
    const content = match[2].trim();

    if (!["do", "say", "click", "write", "confirm"].includes(tag)) continue;

    // Extract quoted script for SAY/WRITE types
    let script: string | undefined;
    if (tag === "say" || tag === "write") {
      const scriptMatch = content.match(/^[""](.+)[""]$/);
      if (scriptMatch) {
        script = scriptMatch[1];
      } else if (content.includes('"')) {
        const innerMatch = content.match(/"([^"]+)"/);
        if (innerMatch) script = innerMatch[1];
      }
    }

    actions.push({ instruction: content, type: tag, script });
  }

  // Fallback: if parsing failed, create a single action from the whole response
  if (actions.length === 0) {
    actions.push({
      instruction: raw.trim(),
      type: "do",
    });
  }

  return { stepTitle, actions };
}

export function buildExecutionPrompt(
  stepTitle: string,
  stepDesc: string,
  day: number,
  userResponses: Record<string, string>
): string {
  const context = Object.entries(userResponses)
    .map(([k, v]) => `  - ${k}: ${v}`)
    .join("\n");

  return `[EXECUTION MODE] Break this step into 3-5 micro-actions the user can do RIGHT NOW, one at a time.

Step: "${stepTitle}"
Description: "${stepDesc}"
Day: ${day}/7
${context ? `\nUser's previous work:\n${context}` : ""}

RULES:
- Each action must start with a tag: [DO], [SAY], [CLICK], [WRITE], or [CONFIRM]
- [DO] = physical action (open app, go to website, etc.)
- [SAY] = exact words to say or write in a message (wrap in quotes)
- [CLICK] = UI action (press button, tap link, etc.)
- [WRITE] = text to type somewhere (wrap the text in quotes)
- [CONFIRM] = ask user if they completed it
- Make it ULTRA specific — no vague instructions
- Personalize using the user's previous responses when available
- Last action should always be [CONFIRM]
- Keep each action to 1-2 sentences max
- If the step involves sending a message, WRITE the exact message for them
- Respond in the same language context as the step title`;
}
