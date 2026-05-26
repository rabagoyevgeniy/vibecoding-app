import { NexusToolDefinition, RiskLevel, NexusToolResult } from '../types';

/**
 * Base abstract class for all Nexus tools.
 * 
 * Every business or system tool in Nexus v2.0 must extend this class.
 * This provides a consistent interface for the future NexusEngine orchestrator.
 */
export abstract class BaseNexusTool {
  /**
   * The definition that will be sent to Claude as a native tool.
   */
  abstract readonly definition: NexusToolDefinition;

  /**
   * Risk classification used by the HITL (Human-in-the-Loop) system.
   * - 'low'    → Can execute automatically (analysis, generation)
   * - 'medium' → Show preview + "Apply" button
   * - 'high'   → Require explicit confirmation modal
   */
  abstract readonly riskLevel: RiskLevel;

  /**
   * Human-friendly name shown in the UI.
   */
  abstract readonly displayName: string;

  /**
   * Execute the tool.
   * 
   * @param args - The arguments provided by the AI (or user via UI)
   * @param userId - The authenticated user's Supabase ID
   * @returns Structured result including whether an artifact was persisted
   */
  abstract execute(args: any, userId: string): Promise<NexusToolResult>;

  /**
   * Optional validation before execution (used by validator layer later).
   */
  validate?(args: any): { valid: boolean; errors?: string[] } {
    return { valid: true };
  }
}
