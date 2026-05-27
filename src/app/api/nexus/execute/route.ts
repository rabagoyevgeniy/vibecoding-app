import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase-server';
import { guardApiRoute } from '@/lib/auth-guard';

// Server-only Anthropic client (API key never leaves the server)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  const guard = await guardApiRoute();
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const { userId: requestedUserId, toolName, input, currentDay } = body;

    const userId = guard.user.id;
    if (requestedUserId && requestedUserId !== userId) {
      return NextResponse.json(
        { error: 'userId mismatch with session' },
        { status: 403 }
      );
    }
    if (!toolName || !input) {
      return NextResponse.json({ error: 'toolName and input are required' }, { status: 400 });
    }

    // Support both execution tools (site layout + database schema for Day 4)
    if (toolName !== 'site_layout_builder' && toolName !== 'database_schema_builder') {
      return NextResponse.json({ error: 'Execution not yet supported for this tool' }, { status: 400 });
    }

    // === DEEP CONTEXT + STRICT OUTPUT ENFORCEMENT (shared for all tools) ===
    const supabase = await createClient();
    let deepContext = '';

    try {
      const { data: profile } = await supabase
        .from('vc_profiles')
        .select('onboarding_answers, onboarding_data')
        .eq('user_id', userId)
        .single();

      const onboarding = profile?.onboarding_answers || profile?.onboarding_data || {};
      const day = (input as any)?.day || currentDay || 4;

      deepContext = `
**Mission Context (VibeCoding 7D(AI)S program):**
- Current Day: ${day}
- User's Primary Goal: ${onboarding.goal || 'Not specified'}
- Business Idea / Niche: ${onboarding.idea || onboarding.business_idea || 'the project described in the input below'}
- Experience Level: ${onboarding.experience || 'Not specified'}
- Hard Skills: ${Array.isArray(onboarding.hard_skills) ? onboarding.hard_skills.join(', ') : (onboarding.hard_skills || 'Not specified')}
- Budget / Constraints: ${onboarding.budget || 'Not specified'}

Use the business context above to make the generated artifact (HTML or SQL schema) perfectly aligned with the user's real product, constraints and domain. Never use completely generic placeholders when real details are known from onboarding.
`;
    } catch (e) {
      deepContext = `
**Mission Context (fallback):**
- Current Day: ${currentDay || 4}
- Generate production-ready artifact for the project described in the input.
`;
    }

    let systemPrompt = '';
    let userContent = '';
    let maxTokens = 4096;

    if (toolName === 'site_layout_builder') {
      // Existing powerful prompt for Tailwind HTML (kept from previous sprint)
      systemPrompt = `You are an expert frontend developer specializing in beautiful, conversion-focused landing pages.

Your task is to generate ONLY a complete, self-contained HTML document using Tailwind CSS (via CDN) based on the provided JSON landing page structure.

${deepContext}

STRICT OUTPUT RULES (CRITICAL - violation will break the pipeline):
- Respond with STRICTLY valid HTML only. 
- NO markdown code fences (no \`\`\`html), NO explanations, NO introductory sentences, NO text before the <!DOCTYPE or after </html>.
- The response must be directly usable as a .html file.

Design & Quality requirements:
- Use modern design: clean typography, generous whitespace, subtle gradients, tasteful shadows, smooth interactions.
- Include the Tailwind Play CDN: <script src="https://cdn.tailwindcss.com"></script>
- Make the page fully responsive and visually stunning.
- Use high-quality emoji or Heroicons (via inline SVG) where appropriate.
- Structure must match the JSON: Hero → Advantages/Features → Pricing → Footer.
- Add subtle animations and hover effects where they improve UX.
- The final output must be a ready-to-use single-file landing page.`;

      userContent = `Here is the landing page structure in JSON format:

${JSON.stringify(input, null, 2)}

Generate the complete, production-ready HTML now.`;
      maxTokens = 8192;

    } else if (toolName === 'database_schema_builder') {
      // === NEW: Powerful prompt for Day 4 Database Schema Builder ===
      systemPrompt = `You are an expert PostgreSQL database architect specializing in Supabase.

Your task is to generate a clean, production-ready SQL DDL script (CREATE TABLE, indexes, foreign keys, triggers) for the given business entities.

${deepContext}

REQUIREMENTS FOR THE GENERATED SCHEMA (must be followed exactly):
- Use UUID as primary keys (gen_random_uuid() or uuid_generate_v4()).
- Add created_at timestamptz DEFAULT now() and updated_at timestamptz DEFAULT now() on every table.
- Add proper Foreign Key constraints with ON DELETE / ON UPDATE rules where logical.
- Add basic but useful Row Level Security (RLS) policies for Supabase (enable RLS + at least one policy per table that respects auth.uid() when user_id column exists).
- Create indexes on foreign keys and commonly filtered columns.
- Add a trigger to automatically maintain updated_at on row changes (use the standard Supabase pattern).
- Output ONLY valid executable PostgreSQL SQL. No comments explaining what you did, no markdown, no prose — pure SQL that can be copied directly into Supabase SQL Editor.

STRICT OUTPUT RULES:
- Return STRICTLY valid SQL code only.
- NO markdown fences (\`\`\`sql), NO explanations, NO "Here is the schema:", NO text before the first CREATE or after the last statement.
- The output must be directly runnable.`;

      const projectName = (input as any)?.project_name || 'Project';
      const entities = (input as any)?.entities || [];
      const notes = (input as any)?.notes || '';

      userContent = `Project: ${projectName}
Entities to model: ${JSON.stringify(entities)}
Additional notes / business rules: ${notes || 'None'}

Generate the complete, production-ready Supabase PostgreSQL DDL script now.`;
      maxTokens = 4096;
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
      temperature: 0.2,
    });

    let rawOutput = '';
    if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
      rawOutput = response.content[0].text;
    }

    // === UNIVERSAL CLEANUP + ERROR LOGGING (supports html and sql) ===
    const rawTextForLog = rawOutput || JSON.stringify(response.content);

    let cleaned = rawOutput
      .replace(/^```html\s*/i, '')
      .replace(/^```sql\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    // Tool-specific validation
    if (toolName === 'site_layout_builder') {
      if (!cleaned || cleaned.length < 100) {
        console.error('[Nexus Execute API] HTML parse or quality failure. Full raw model response:');
        console.error(rawTextForLog);
        throw new Error('Model returned insufficient or malformed HTML content. See server logs for full Claude output.');
      }
    } else if (toolName === 'database_schema_builder') {
      if (!cleaned || cleaned.length < 50 || !cleaned.toUpperCase().includes('CREATE TABLE')) {
        console.error('[Nexus Execute API] SQL parse or quality failure. Full raw model response:');
        console.error(rawTextForLog);
        throw new Error('Model returned insufficient or malformed SQL content. See server logs for full Claude output.');
      }
    }

    const finalOutput = cleaned;

    // Return shape depends on the tool
    if (toolName === 'site_layout_builder') {
      return NextResponse.json({
        success: true,
        html: finalOutput,
        toolName,
      });
    } else {
      return NextResponse.json({
        success: true,
        sql: finalOutput,
        toolName,
      });
    }
  } catch (error: any) {
    console.error('[Nexus Execute API] Error generating artifact:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute artifact generation',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
