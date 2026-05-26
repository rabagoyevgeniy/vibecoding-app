import { BaseNexusTool } from './base';
import { NexusToolDefinition, RiskLevel, NexusToolResult } from '../types';
import { saveArtifact } from '@/lib/supabase-storage';

/**
 * Lead Campaign Builder — Tool for Day 5 (High Risk)
 * 
 * Generates a full advertising campaign structure.
 * riskLevel 'high' to test full HITL protection (red badges, explicit confirmation).
 */
export class LeadCampaignBuilderTool extends BaseNexusTool {
  readonly displayName = 'Lead Campaign Builder';

  readonly riskLevel: RiskLevel = 'high';

  readonly definition: NexusToolDefinition = {
    name: 'lead_campaign_builder',
    description: 'Create a complete lead generation advertising campaign. Define target audience, ad creatives, channels, and budget. Use on Day 5 or when the user is ready to run paid acquisition. The AI must provide detailed, realistic campaign parameters.',
    input_schema: {
      type: 'object',
      properties: {
        day: {
          type: 'number',
          description: 'Current day in the program (usually 5).',
        },
        target_audience: {
          type: 'object',
          description: 'Detailed targeting parameters',
          properties: {
            age_range: { type: 'string', description: 'e.g. 25-45' },
            geo: { type: 'string', description: 'Countries or cities' },
            interests: {
              type: 'array',
              items: { type: 'string' },
              description: 'Key interests and behaviors',
            },
            pain_points: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['age_range', 'geo', 'interests'],
        },
        creatives: {
          type: 'array',
          description: 'Ad copy variations',
          items: {
            type: 'object',
            properties: {
              headline: { type: 'string' },
              body_text: { type: 'string' },
              cta: { type: 'string' },
            },
            required: ['headline', 'body_text', 'cta'],
          },
        },
        channels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Traffic sources: facebook, google, linkedin, tiktok, etc.',
        },
        recommended_budget: {
          type: 'object',
          properties: {
            daily: { type: 'number' },
            currency: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      },
      required: ['target_audience', 'creatives', 'channels', 'recommended_budget'],
    },
  };

  async execute(args: any, userId: string): Promise<NexusToolResult> {
    if (!args || !args.target_audience || !args.creatives) {
      return {
        success: false,
        summary: 'Invalid ad campaign structure.',
        error: 'invalid_campaign_data',
      };
    }

    try {
      const day = args.day || 5;

      await saveArtifact(userId, day, args, 'ad_campaign');

      return {
        success: true,
        data: args,
        summary: `High-risk ad campaign for Day ${day} saved. Requires user approval before launch.`,
        artifactSaved: true,
      };
    } catch (error: any) {
      console.error('[Nexus] LeadCampaignBuilderTool error:', error);
      return {
        success: false,
        summary: 'Failed to save campaign artifact.',
        error: error.message || 'save_failed',
      };
    }
  }
}

// Export instance for registration
export const leadCampaignBuilder = new LeadCampaignBuilderTool();
