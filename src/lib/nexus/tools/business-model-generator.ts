import { BaseNexusTool } from './base';
import { NexusToolDefinition, RiskLevel, NexusToolResult } from '../types';
import { saveArtifact } from '@/lib/supabase-storage';

/**
 * Business Model Generator — Pilot Tool for Day 1
 * 
 * Generates a structured Lean Canvas / Business Model based on the user's idea.
 * This is a "low risk" generative tool (no external side effects besides saving the artifact).
 */
export class BusinessModelGeneratorTool extends BaseNexusTool {
  readonly displayName = 'Business Model Generator';

  readonly riskLevel: RiskLevel = 'low';

  readonly definition: NexusToolDefinition = {
    name: 'business_model_generator',
    description: 'Generate a complete Lean Canvas business model (problem, solution, unique value proposition, channels, customer segments, revenue streams, cost structure, key metrics) based on a user\'s business idea. Use this on Day 1 or when the user wants to refine their core business model.',
    input_schema: {
      type: 'object',
      properties: {
        idea: {
          type: 'string',
          description: 'The core business idea or problem the user wants to solve. Can include target audience hints.',
        },
        goal: {
          type: 'string',
          description: 'User\'s primary goal: "money", "startup", or "ai". Helps tailor the model.',
          enum: ['money', 'startup', 'ai'],
        },
        targetAudience: {
          type: 'string',
          description: 'Optional: specific target audience or niche mentioned by the user.',
        },
      },
      required: ['idea'],
    },
  };

  async execute(args: { idea: string; goal?: string; targetAudience?: string }, userId: string): Promise<NexusToolResult> {
    const { idea, goal = 'money', targetAudience } = args;

    if (!idea || idea.trim().length < 10) {
      return {
        success: false,
        summary: 'Business idea is too short or missing.',
        error: 'idea_too_short',
      };
    }

    try {
      // Build a strong prompt for structured business model generation
      const prompt = this.buildBusinessModelPrompt(idea, goal, targetAudience);

      // Call the existing AI endpoint (reuse the project's AI infrastructure)
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'business_model',
          user_message: prompt,
          current_day: 1,
          language: 'en', // Can be extended later
        }),
      });

      if (!res.ok) {
        throw new Error(`AI generation failed: ${res.status}`);
      }

      const data = await res.json();
      let canvas = data?.response || data?.content || data?.text;

      // If the AI didn't return perfect JSON, try to extract or create a fallback structure
      if (typeof canvas === 'string') {
        canvas = this.parseOrFallbackCanvas(canvas, idea);
      }

      // Ensure we have a proper structured object
      const structuredCanvas = this.normalizeCanvas(canvas, idea, goal);

      // Persist as artifact for Day 1 using our existing Supabase layer
      await saveArtifact(
        userId,
        1,
        structuredCanvas,
        'Lean Canvas - Business Model'
      );

      return {
        success: true,
        data: structuredCanvas,
        summary: `Generated Lean Canvas for "${idea.substring(0, 60)}..." and saved to your Day 1 artifacts.`,
        artifactSaved: true,
      };
    } catch (error: any) {
      console.error('[Nexus] BusinessModelGenerator error:', error);
      return {
        success: false,
        summary: 'Failed to generate business model.',
        error: error.message || 'unknown_error',
      };
    }
  }

  private buildBusinessModelPrompt(idea: string, goal: string, targetAudience?: string): string {
    return `You are an expert startup coach helping a user build their business on Day 1 of the VibeCoding 7-day program.

User's core idea: "${idea}"
User's goal: ${goal}
${targetAudience ? `Target audience hint: ${targetAudience}` : ''}

Generate a complete, realistic Lean Canvas (Business Model Canvas) for this idea.

Return ONLY a valid JSON object with the following structure (no markdown, no explanations outside the JSON):

{
  "problem": ["list of top 3-5 problems"],
  "solution": ["list of key solutions"],
  "uniqueValueProposition": "One powerful sentence",
  "unfairAdvantage": "What makes this hard to copy?",
  "customerSegments": ["primary segment", "secondary if relevant"],
  "channels": ["how we reach customers"],
  "revenueStreams": ["pricing models and streams"],
  "costStructure": ["main cost categories"],
  "keyMetrics": ["the 3-5 most important numbers to track"],
  "existingAlternatives": ["what customers do today instead"]
}

Make it specific to the idea, actionable, and realistic for a solo founder or small team. Focus on the "money" or "startup" angle depending on the goal.`;
  }

  private parseOrFallbackCanvas(raw: string, idea: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (_) {
      // fall through to fallback
    }

    // Fallback structured model
    return {
      problem: [`Users struggle with: ${idea}`],
      solution: ['Core solution based on the idea'],
      uniqueValueProposition: `A better way to solve ${idea}`,
      unfairAdvantage: 'First-mover insight + execution speed',
      customerSegments: ['Early adopters interested in the idea'],
      channels: ['Organic content', 'Communities', 'Direct outreach'],
      revenueStreams: ['Subscription', 'One-time purchase', 'Freemium'],
      costStructure: ['Development', 'Marketing', 'Tools'],
      keyMetrics: ['Activation rate', 'Retention', 'Revenue per user'],
      existingAlternatives: ['Doing nothing', 'Manual workarounds'],
    };
  }

  private normalizeCanvas(canvas: any, idea: string, goal: string) {
    return {
      idea,
      goal,
      generatedAt: new Date().toISOString(),
      ...canvas,
      _meta: {
        tool: 'business_model_generator',
        version: '1.0',
      },
    };
  }
}

// Export a singleton instance for easy registration later
export const businessModelGenerator = new BusinessModelGeneratorTool();
