import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { nexusEngine } from '@/lib/nexus';
import { createClient } from '@/lib/supabase-server';
import type { NexusAction, NexusToolResult } from '@/lib/nexus/types';

// Initialize Anthropic client safely on the server
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userPrompt, currentDay } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Default test prompt as specified
    const finalPrompt =
      userPrompt ||
      'Разработай бизнес-модель для школы плавания Profit Swimming, где мы учим детей плавать';

    // === DEEP CONTEXT INJECTION ===
    const supabase = await createClient();
    let deepContext = '';

    try {
      const { data: profile } = await supabase
        .from('vc_profiles')
        .select('onboarding_answers, onboarding_data')
        .eq('user_id', userId)
        .single();

      const onboarding = profile?.onboarding_answers || profile?.onboarding_data || {};

      if (onboarding.budget || onboarding.hard_skills || onboarding.current_assets) {
        deepContext = `
**Deep User Context from Onboarding (use this to make recommendations realistic and personalized):**

- Primary Goal: ${onboarding.goal || 'Not specified'}
- Experience Level: ${onboarding.experience || 'Not specified'}
- Daily Available Time: ${onboarding.time_per_day || 'Not specified'}
- Budget / Financial Situation: ${onboarding.budget || 'Not specified'} (ALWAYS respect this budget strictly)
- Hard Skills & Background: ${Array.isArray(onboarding.hard_skills) ? onboarding.hard_skills.join(', ') : onboarding.hard_skills || 'Not specified'}
- Current Assets (audience, products, equipment, past projects): ${onboarding.current_assets || 'Not specified'}
`;
      } else {
        // Fallback test context as specified
        deepContext = `
**Deep User Context (fallback for testing - treat as real user data):**

Пользователь — основатель школы ProFit Swimming в Дубае. Имеет технические навыки (Python, ИИ), опыт в геймдеве (DESTINY). Бюджет указывай строго в AED.

Пользователь хочет строить реальный, монетизируемый бизнес и имеет практический опыт в разработке и запуске проектов.
`;
      }
    } catch (e) {
      // Silent fallback
      deepContext = `
**Deep User Context (fallback):**

Пользователь — основатель школы ProFit Swimming в Дубае. Имеет технические навыки (Python, ИИ), опыт в геймдеве (DESTINY). Бюджет указывай строго в AED.
`;
    }

    // Collect tool definitions from the registered tools in NexusEngine
    const registeredTools = nexusEngine.getRegisteredTools();
    const claudeTools = registeredTools.map((tool) => ({
      name: tool.definition.name,
      description: tool.definition.description,
      input_schema: tool.definition.input_schema,
    }));

    // System prompt for Claude - now with Deep Context Injection + STRICT TOOL-USE ENFORCEMENT
    const systemPrompt = `You are Nexus, an expert AI business mentor for the "VibeCoding 7D(AI)S" program — a 7-day intensive for building real AI-powered businesses.

${deepContext}

Current program context:
- Day: ${currentDay || 1}
- User request: ${finalPrompt}

Your job is to help the user progress by calling the most relevant registered tools.

**CRITICAL OUTPUT RULES (prevents garbage responses):**
- You MUST use the tools via native tool_use / function calls. 
- NEVER output plain text explanations, markdown, or conversational replies without at least one tool call.
- If the request matches a tool (business_model_generator, site_layout_builder, database_schema_builder, etc.), CALL IT.
- Respond ONLY with tool calls in the exact Anthropic format when tools are appropriate.

**Critical instructions:**
- Always respect the user's real constraints (budget, skills, time, assets) when suggesting tools and parameters.
- For high-risk tools (like lead_campaign_builder), be extremely conservative with budget recommendations.
- Make recommendations hyper-personalized based on the Deep User Context above.
- Always prefer calling tools when they match the user's intent.
- Return tool calls in the proper format.
`;

    // Call Anthropic with native Tool Use
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: finalPrompt,
        },
      ],
      tools: claudeTools,
      tool_choice: { type: 'auto' },
    });

    const actions: NexusAction[] = [];

    // Parse tool_use blocks from Claude's response
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const tool = registeredTools.find((t) => t.definition.name === block.name);
        if (tool) {
          const action: NexusAction = {
            id: `nx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            toolName: block.name,
            input: block.input as Record<string, any>,
            status: 'pending',
            riskLevel: tool.riskLevel,
            createdAt: new Date().toISOString(),
          };
          actions.push(action);
        }
      }
    }

    // === FULL RESPONSE LOG on missing tool_use (helps debug "мусор" / garbage text responses) ===
    if (actions.length === 0 && !(finalPrompt.toLowerCase().includes('profit swimming') || finalPrompt.toLowerCase().includes('школа плавания'))) {
      console.error('[Nexus Plan API] No tool_use blocks found in Claude response. Full raw content:');
      console.error(JSON.stringify(response.content, null, 2));
    }

    // === DEMO SIMULATION for testing HITL flow (Day 1 + Day 3) ===
    // When using the "Profit Swimming" test prompt, force a plan with two actions:
    // 1. business_model_generator (low risk) - executes immediately
    // 2. site_layout_builder (medium risk) - triggers pending_approval + "Подтвердить" button
    if (finalPrompt.toLowerCase().includes('profit swimming') || finalPrompt.toLowerCase().includes('школа плавания')) {
      const demoActions: any[] = [
        // Action 1: Low risk - Business Model
        {
          id: `nx_demo_${Date.now()}_1`,
          toolName: 'business_model_generator',
          input: {
            idea: 'Школа плавания Profit Swimming — обучение детей плаванию с 4 лет',
            goal: 'money',
            targetAudience: 'Родители детей 4-12 лет в крупных городах',
          },
          status: 'pending',
          riskLevel: 'low',
          createdAt: new Date().toISOString(),
        },
        // Action 2: Medium risk - Site Layout (for HITL testing)
        {
          id: `nx_demo_${Date.now()}_2`,
          toolName: 'site_layout_builder',
          input: {
            day: 3,
            hero: {
              title: 'Profit Swimming — Дети, которые уверенно плавают',
              subtitle: 'Профессиональная школа плавания для детей от 4 до 12 лет. Безопасно, весело и эффективно.',
              ctaText: 'Записаться на бесплатное пробное занятие',
              ctaLink: '#contact',
            },
            advantages: [
              { title: 'Безопасность', description: 'Маленькие группы и сертифицированные тренеры' },
              { title: 'Методика', description: 'Авторская программа от олимпийских чемпионов' },
              { title: 'Результаты', description: '90% детей свободно плавают через 3 месяца' },
              { title: 'Атмосфера', description: 'Игровой подход без стресса' },
            ],
            pricing: {
              title: 'Тарифы на 2026 год',
              tiers: [
                { name: 'Старт', price: '4 500 ₽/мес', features: ['2 занятия в неделю', 'Группа до 8 человек'] },
                { name: 'Оптимум', price: '7 500 ₽/мес', features: ['3 занятия', 'Персональный план', 'Рекомендуемый'], recommended: true },
                { name: 'Премиум', price: '12 000 ₽/мес', features: ['5 занятий', 'Индивидуальные тренировки'] },
              ],
            },
            footer: {
              copyright: '© 2026 Profit Swimming',
            },
          },
          status: 'pending',
          riskLevel: 'medium',
          createdAt: new Date().toISOString(),
        },
      ];

      return NextResponse.json({ actions: demoActions });
    }

    // If no tools were called, fall back to a basic action for the main tool
    if (actions.length === 0 && registeredTools.length > 0) {
      const firstTool = registeredTools[0];
      actions.push({
        id: `nx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        toolName: firstTool.definition.name,
        input: { idea: finalPrompt },
        status: 'pending',
        riskLevel: firstTool.riskLevel,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ actions });
  } catch (error: any) {
    console.error('[Nexus API] Error generating plan:', error);
    return NextResponse.json(
      { error: 'Failed to generate plan', details: error.message },
      { status: 500 }
    );
  }
}
