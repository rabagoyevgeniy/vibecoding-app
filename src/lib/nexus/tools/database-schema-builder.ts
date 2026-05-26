import { BaseNexusTool } from './base';
import { NexusToolDefinition, RiskLevel, NexusToolResult } from '../types';
import { saveArtifact } from '@/lib/supabase-storage';

/**
 * Database Schema Builder — Tool for Day 4
 * 
 * Generates a relational database schema (SQL) based on the user's business entities.
 * Helps the founder quickly get a production-ready DB structure.
 */
export class DatabaseSchemaBuilderTool extends BaseNexusTool {
  readonly displayName = 'Database Schema Builder';

  readonly riskLevel: RiskLevel = 'medium';

  readonly definition: NexusToolDefinition = {
    name: 'database_schema_builder',
    description: 'Generate a complete relational database schema (PostgreSQL or similar) for the user\'s project. Provide the project name and a list of main business entities (e.g. Users, Orders, Products, Payments). The tool will output CREATE TABLE statements, relationships, and indexes.',
    input_schema: {
      type: 'object',
      properties: {
        day: {
          type: 'number',
          description: 'The current day of the program (usually 4).',
        },
        project_name: {
          type: 'string',
          description: 'Name of the project / product (e.g. "Profit Swimming School")',
        },
        entities: {
          type: 'array',
          description: 'List of main business entities/tables the user wants to model',
          items: {
            type: 'string',
          },
          minItems: 1,
        },
        notes: {
          type: 'string',
          description: 'Any additional requirements or business rules (optional)',
        },
      },
      required: ['project_name', 'entities'],
    },
  };

  async execute(args: any, userId: string): Promise<NexusToolResult> {
    if (!args || !args.project_name || !Array.isArray(args.entities)) {
      return {
        success: false,
        summary: 'Invalid input for database schema generation.',
        error: 'missing_project_or_entities',
      };
    }

    try {
      const day = args.day || 4;

      // === REAL EXECUTION PIPELINE (Day 4) ===
      // 1. Call the secure server-side execution API to turn entities → real Supabase SQL
      const execResponse = await fetch('/api/nexus/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          toolName: 'database_schema_builder',
          input: args,
          currentDay: day,
        }),
      });

      if (!execResponse.ok) {
        const errorData = await execResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Execution API request failed');
      }

      const { sql, success } = await execResponse.json();

      if (!success || !sql) {
        throw new Error('No SQL content returned from execution service');
      }

      // 2. Persist the FINAL SQL artifact (directly usable in Supabase SQL Editor)
      await saveArtifact(userId, day, sql, 'database_schema_sql');

      return {
        success: true,
        data: { sql, project: args.project_name, entities: args.entities },
        summary: `Production-ready Supabase PostgreSQL schema generated for ${args.project_name} (Day ${day}). SQL saved and ready for preview/execution.`,
        artifactSaved: true,
      };
    } catch (error: any) {
      console.error('[Nexus] DatabaseSchemaBuilderTool error:', error);
      return {
        success: false,
        summary: 'Failed to generate database schema.',
        error: error.message || 'generation_failed',
      };
    }
  }
}

// Export singleton instance for registration in NexusEngine
export const databaseSchemaBuilder = new DatabaseSchemaBuilderTool();
