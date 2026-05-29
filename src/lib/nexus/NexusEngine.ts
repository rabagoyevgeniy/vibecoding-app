import { BaseNexusTool } from './tools/base';
import { businessModelGenerator } from './tools/business-model-generator';
import { siteLayoutBuilder } from './tools/site-layout-builder';
import { leadCampaignBuilder } from './tools/lead-campaign-builder';
import { databaseSchemaBuilder } from './tools/database-schema-builder';
import { saveNexusSession, loadNexusSession } from './storage';
import {
  NexusAction,
  NexusSession,
  NexusToolResult,
  NexusActionStatus,
  RiskLevel,
} from './types';

/** Simple UUID fallback (avoids extra dependency for now) */
function generateId(): string {
  return 'nx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
}

/** Результат генерации плана: actions + статус сохранения Smart Quests. */
export interface GeneratePlanResult {
  actions: NexusAction[];
  smartQuestsInserted: boolean;
  /** Текст ошибки, если квесты не сохранились или сработал mock-fallback. */
  persistError?: string;
  /** true, если сервер был недоступен и вернулся локальный mock-план. */
  usedFallback?: boolean;
}

/**
 * NexusEngine v2.0 — The central orchestrator for the AI agent system.
 *
 * Responsibilities:
 * - Tool registry
 * - Plan generation (via Claude or mock)
 * - Execution with Human-in-the-Loop (HITL) gates
 * - Session management
 *
 * Designed as a singleton for consistent state across the app.
 */
export class NexusEngine {
  private static instance: NexusEngine | null = null;

  /** Registered tools by name */
  private tools: Map<string, BaseNexusTool> = new Map();

  /** Active sessions keyed by userId (for Phase 2 simplicity) */
  private sessions: Map<string, NexusSession> = new Map();

  private constructor() {
    this.registerDefaultTools();
  }

  /**
   * Get the singleton instance of NexusEngine.
   */
  public static getInstance(): NexusEngine {
    if (!NexusEngine.instance) {
      NexusEngine.instance = new NexusEngine();
    }
    return NexusEngine.instance;
  }

  // ============================================
  // TOOL REGISTRY
  // ============================================

  private registerDefaultTools(): void {
    this.registerTool(businessModelGenerator);
    this.registerTool(siteLayoutBuilder); // Day 3 - medium risk (HITL test)
    this.registerTool(leadCampaignBuilder); // Day 5 - high risk (full HITL protection)
    this.registerTool(databaseSchemaBuilder); // Day 4 - Database Schema Builder
    // Future tools will be registered here:
    // this.registerTool(leadExtractor);
  }

  public registerTool(tool: BaseNexusTool): void {
    if (this.tools.has(tool.definition.name)) {
      console.warn(`[NexusEngine] Tool "${tool.definition.name}" is already registered. Overwriting.`);
    }
    this.tools.set(tool.definition.name, tool);
  }

  public getTool(name: string): BaseNexusTool | undefined {
    return this.tools.get(name);
  }

  public getRegisteredTools(): BaseNexusTool[] {
    return Array.from(this.tools.values());
  }

  // ============================================
  // SESSION MANAGEMENT (internal)
  // ============================================

  private async getOrCreateSession(userId: string, day: number, userIdea?: string): Promise<NexusSession> {
    const key = `${userId}-${day}`;
    let session = this.sessions.get(key);

    if (!session) {
      // Try to load from persistent storage first (survives refresh)
      const persisted = await loadNexusSession(userId, day);
      if (persisted) {
        session = persisted;
        this.sessions.set(key, session);
        return session;
      }

      // Create new session
      session = {
        id: generateId(),
        userId,
        day,
        goal: 'money',
        userIdea,
        status: 'active',
        actions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {},
      };
      this.sessions.set(key, session);

      // Persist immediately
      await saveNexusSession(userId, day, session);
    }

    return session;
  }

  public getSession(userId: string, day: number): NexusSession | undefined {
    return this.sessions.get(`${userId}-${day}`);
  }

  // ============================================
  // PLAN GENERATION (via secure server API route)
  // ============================================

  /**
   * Generates a plan of actions by calling the secure server-side API route.
   * This keeps the Anthropic API key safe on the server.
   */
  public async generatePlan(
    userId: string,
    userPrompt: string,
    currentDay: number
  ): Promise<GeneratePlanResult> {
    const session = await this.getOrCreateSession(userId, currentDay, userPrompt);

    // === Test prompt for development (as requested) ===
    const finalPrompt =
      userPrompt ||
      'Разработай бизнес-модель для школы плавания Profit Swimming, где мы учим детей плавать';

    try {
      const response = await fetch('/api/nexus/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userPrompt: finalPrompt,
          currentDay,
        }),
      });

      if (!response.ok) {
        throw new Error(`API route error: ${response.status}`);
      }

      const data = await response.json();
      const actions: NexusAction[] = data.actions || [];

      // Attach generated actions to the local session
      if (actions.length > 0) {
        session.actions.push(...actions);
        session.updatedAt = new Date().toISOString();
        
        // Persist the new plan to DB so it survives refresh
        await saveNexusSession(userId, currentDay, session);
      }

      return {
        actions,
        smartQuestsInserted: data.smartQuestsInserted ?? false,
        persistError: data.persistError,
      };
    } catch (error: any) {
      console.error('[NexusEngine] Failed to call /api/nexus/plan:', error);
      // Graceful fallback to local mock — помечаем как fallback, чтобы UI
      // мог показать предупреждение «работаем в офлайн-режиме».
      const mockActions = this.getMockPlan(finalPrompt, currentDay);
      session.actions.push(...mockActions);
      session.updatedAt = new Date().toISOString();
      return {
        actions: mockActions,
        smartQuestsInserted: false,
        usedFallback: true,
        persistError: error?.message || 'Сервер планирования недоступен.',
      };
    }
  }

  /** Internal fallback mock (used when API key is missing or error occurs) */
  private getMockPlan(userPrompt: string, currentDay: number): NexusAction[] {
    const actions: NexusAction[] = [];

    // Default to business model generator for testing
    actions.push({
      id: generateId(),
      toolName: 'business_model_generator',
      input: {
        idea: userPrompt,
        goal: 'money',
      },
      status: 'pending',
      riskLevel: 'low',
      createdAt: new Date().toISOString(),
    });

    return actions;
  }

  // ============================================
  // EXECUTION WITH HITL
  // ============================================

  /**
   * Executes a specific action from the plan.
   * Respects risk levels and Human-in-the-Loop requirements.
   */
  public async executeAction(actionId: string, userId: string): Promise<NexusToolResult> {
    // Find the action in any active session for this user
    let targetSession: NexusSession | undefined;
    let targetAction: NexusAction | undefined;

    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        const action = session.actions.find((a) => a.id === actionId);
        if (action) {
          targetSession = session;
          targetAction = action;
          break;
        }
      }
    }

    if (!targetAction || !targetSession) {
      return {
        success: false,
        summary: 'Action not found',
        error: 'action_not_found',
      };
    }

    const tool = this.getTool(targetAction.toolName);
    if (!tool) {
      targetAction.status = 'failed';
      targetAction.error = `Tool "${targetAction.toolName}" not registered`;
      return {
        success: false,
        summary: targetAction.error,
        error: 'tool_not_found',
      };
    }

    // === Human-in-the-Loop Gate ===
    if (targetAction.riskLevel === 'medium' || targetAction.riskLevel === 'high') {
      if (targetAction.status !== 'approved') {
        targetAction.status = 'pending_approval';
        targetSession.updatedAt = new Date().toISOString();
        
        // Persist the pending state
        await saveNexusSession(targetSession.userId, targetSession.day, targetSession);
        
        return {
          success: false,
          summary: 'Action requires user approval before execution.',
          error: 'pending_approval',
        };
      }
    }

    // === Execute (low risk or approved) ===
    targetAction.status = 'executing';
    targetSession.updatedAt = new Date().toISOString();

    const startTime = Date.now();

    try {
      const result: NexusToolResult = await tool.execute(targetAction.input, userId);

      targetAction.status = result.success ? 'completed' : 'failed';
      targetAction.result = result.data;
      targetAction.error = result.error;
      targetAction.executedAt = new Date().toISOString();
      targetAction.durationMs = Date.now() - startTime;

      // Update session metadata
      if (!targetSession.metadata) targetSession.metadata = {};
      targetSession.metadata.toolsUsed = [
        ...(targetSession.metadata.toolsUsed || []),
        targetAction.toolName,
      ];

      // Persist to DB
      await saveNexusSession(targetSession.userId, targetSession.day, targetSession);

      return result;
    } catch (error: any) {
      targetAction.status = 'failed';
      targetAction.error = error.message || 'Unknown execution error';
      targetAction.executedAt = new Date().toISOString();

      return {
        success: false,
        summary: 'Tool execution threw an exception',
        error: targetAction.error,
      };
    }
  }

  /**
   * Approves a pending action (called from UI after user confirmation).
   */
  public async approveAction(actionId: string, userId: string): Promise<boolean> {
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        const action = session.actions.find((a) => a.id === actionId);
        if (action && (action.status === 'pending' || action.status === 'pending_approval')) {
          action.status = 'approved';
          action.approvedAt = new Date().toISOString();
          session.updatedAt = new Date().toISOString();
          
          // Persist approval
          await saveNexusSession(session.userId, session.day, session);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Returns all actions for a user on a specific day (for UI display).
   */
  public getActionsForDay(userId: string, day: number): NexusAction[] {
    const session = this.getSession(userId, day);
    return session?.actions || [];
  }

  /**
   * Loads (or creates) the session for the given user/day from persistence.
   * Populates the in-memory cache and returns the actions array.
   * 
   * This is the safe async entry point for UI components (call from useEffect).
   * It will restore a previously generated plan after page refresh.
   */
  public async loadActionsForDay(userId: string, day: number): Promise<NexusAction[]> {
    try {
      const session = await this.getOrCreateSession(userId, day);
      return session?.actions || [];
    } catch (err) {
      console.error('[NexusEngine] Failed to loadActionsForDay:', err);
      return [];
    }
  }
}

// Export singleton instance for convenience
export const nexusEngine = NexusEngine.getInstance();
