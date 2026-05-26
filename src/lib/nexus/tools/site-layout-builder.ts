import { BaseNexusTool } from './base';
import { NexusToolDefinition, RiskLevel, NexusToolResult } from '../types';
import { saveArtifact } from '@/lib/supabase-storage';

/**
 * Site Layout Builder — Tool for Day 3
 * 
 * Allows the AI to propose a structured landing page layout.
 * Risk level is 'medium' so that the UI can demonstrate the HITL (pending_approval) flow.
 */
export class SiteLayoutBuilderTool extends BaseNexusTool {
  readonly displayName = 'Site Layout Builder';

  readonly riskLevel: RiskLevel = 'medium';

  readonly definition: NexusToolDefinition = {
    name: 'site_layout_builder',
    description: 'Generate or update a professional landing page structure (Hero, Advantages/Features, Pricing tiers, Footer) for the user\'s business. Use this on Day 3 or when the user wants to design their website layout. The AI should provide the full structured content.',
    input_schema: {
      type: 'object',
      properties: {
        day: {
          type: 'number',
          description: 'The current day of the program (usually 3).',
        },
        hero: {
          type: 'object',
          description: 'Hero section at the top of the page',
          properties: {
            title: { type: 'string', description: 'Main headline' },
            subtitle: { type: 'string', description: 'Supporting text under the headline' },
            ctaText: { type: 'string', description: 'Call to action button text' },
            ctaLink: { type: 'string', description: 'Where the CTA leads (e.g. #pricing or /signup)' },
          },
          required: ['title', 'subtitle', 'ctaText'],
        },
        advantages: {
          type: 'array',
          description: 'List of key benefits / features',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              icon: { type: 'string', description: 'Optional emoji or icon name' },
            },
            required: ['title', 'description'],
          },
        },
        pricing: {
          type: 'object',
          description: 'Pricing / tariff section',
          properties: {
            title: { type: 'string' },
            tiers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  price: { type: 'string' },
                  features: { type: 'array', items: { type: 'string' } },
                  recommended: { type: 'boolean' },
                },
                required: ['name', 'price', 'features'],
              },
            },
          },
          required: ['title', 'tiers'],
        },
        footer: {
          type: 'object',
          description: 'Footer section',
          properties: {
            copyright: { type: 'string' },
            links: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  url: { type: 'string' },
                },
              },
            },
          },
        },
      },
      required: ['hero', 'advantages'],
    },
  };

  async execute(args: any, userId: string): Promise<NexusToolResult> {
    if (!args || !args.hero) {
      return {
        success: false,
        summary: 'Invalid landing page structure provided.',
        error: 'missing_hero_section',
      };
    }

    try {
      const day = args.day || 3;

      // === NEW EXECUTION PIPELINE ===
      // 1. Call the secure server-side execution API to transform JSON → real HTML
      const execResponse = await fetch('/api/nexus/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          toolName: 'site_layout_builder',
          input: args,
        }),
      });

      if (!execResponse.ok) {
        const errorData = await execResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Execution API request failed');
      }

      const { html, success } = await execResponse.json();

      if (!success || !html) {
        throw new Error('No HTML content returned from execution service');
      }

      // 2. Persist the FINAL rendered HTML artifact (this is what the user actually uses)
      await saveArtifact(userId, day, html, 'landing_page_html');

      return {
        success: true,
        data: { html, originalStructure: args },
        summary: `Professional landing page HTML successfully generated and saved for Day ${day}. Ready for preview and deployment.`,
        artifactSaved: true,
      };
    } catch (error: any) {
      console.error('[Nexus] SiteLayoutBuilderTool execution error:', error);
      return {
        success: false,
        summary: 'Failed to generate and save landing page HTML.',
        error: error.message || 'execution_failed',
      };
    }
  }
}

// Export singleton instance for registration
export const siteLayoutBuilder = new SiteLayoutBuilderTool();
