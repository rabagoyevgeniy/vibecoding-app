/**
 * Nexus Engine v2.0 — Core Type Definitions
 * 
 * These types define the contract between the AI planning layer,
 * tool execution layer, and the Human-in-the-Loop system.
 */

export type RiskLevel = 'low' | 'medium' | 'high';

export type NexusActionStatus =
  | 'pending'            // Planned by AI, awaiting approval
  | 'pending_approval'   // Waiting for user confirmation (HITL)
  | 'approved'           // User approved execution
  | 'executing'          // Currently running
  | 'completed'          // Successfully executed
  | 'failed'             // Execution failed
  | 'cancelled';         // User cancelled

/**
 * Represents a single planned or executed action by the Nexus agent.
 */
export interface NexusAction {
  id: string;
  toolName: string;
  input: Record<string, any>;
  status: NexusActionStatus;
  riskLevel: RiskLevel;
  result?: any;
  error?: string;
  createdAt: string;
  approvedAt?: string;
  executedAt?: string;
  durationMs?: number;
}

/**
 * A complete Nexus session for a user on a specific day/mission.
 */
export interface NexusSession {
  id: string;
  userId: string;
  day: number;                    // 1-7
  goal: string;                   // e.g. "money", "startup", "ai"
  userIdea?: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  actions: NexusAction[];
  createdAt: string;
  updatedAt: string;
  metadata?: {
    totalXpAwarded?: number;
    toolsUsed?: string[];
    [key: string]: any;
  };
}

/**
 * Tool definition formatted for Anthropic Claude's native Tool Use API.
 * This matches the expected `tools` array format in Anthropic messages.
 */
export interface NexusToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      [key: string]: any;
    }>;
    required?: string[];
  };
}

/**
 * Result returned by any Nexus tool after execution.
 */
export interface NexusToolResult {
  success: boolean;
  data?: any;
  summary: string;
  artifactSaved?: boolean;
  error?: string;
}
