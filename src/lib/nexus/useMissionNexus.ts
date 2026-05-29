"use client";

import { useState, useEffect, useCallback } from 'react';
import { nexusEngine } from './NexusEngine';
import type { NexusAction } from './types';

/**
 * useMissionNexus
 *
 * Custom hook that encapsulates all Nexus v2.0 state and handlers for the Mission page.
 * 
 * Responsibilities:
 * - Local state for the current day's Nexus plan (actions + generating flag)
 * - Automatic restoration of persisted plan from Supabase on mount / day change
 * - Memoized handlers for Generate / Execute / Approve
 * 
 * This keeps MissionPage clean and follows the "hooks for feature logic" pattern.
 */
export interface UseMissionNexusReturn {
  nexusActions: NexusAction[];
  isGeneratingPlan: boolean;
  handleGenerateNexusPlan: () => Promise<void>;
  handleNexusExecute: (actionId: string) => Promise<void>;
  handleNexusApprove: (actionId: string) => Promise<void>;
}

export interface PlanGeneratedMeta {
  smartQuestsInserted: boolean;
  persistError?: string;
  usedFallback?: boolean;
}

export interface UseMissionNexusOptions {
  /** Вызывается после генерации плана с метаданными сохранения квестов. */
  onPlanGenerated?: (meta: PlanGeneratedMeta) => void;
}

export function useMissionNexus(
  userId: string | undefined,
  day: number,
  options?: UseMissionNexusOptions
): UseMissionNexusReturn {
  const [nexusActions, setNexusActions] = useState<NexusAction[]>([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Load persisted Nexus plan (survives refresh)
  // Uses cancellation pattern to avoid setting state on unmounted component
  useEffect(() => {
    if (!userId || !Number.isFinite(day)) return;
    const safeUserId = userId; // capture narrowed value for inner async function

    let cancelled = false;

    async function loadPersistedNexusPlan() {
      try {
        const actions = await nexusEngine.loadActionsForDay(safeUserId, day);
        if (!cancelled) {
          setNexusActions(actions);
        }
      } catch (err) {
        console.error('[useMissionNexus] Failed to load persisted Nexus plan (graceful fallback):', err);
        if (!cancelled) {
          setNexusActions([]);
        }
      }
    }

    void loadPersistedNexusPlan();

    return () => {
      cancelled = true;
    };
  }, [userId, day]);

  const handleGenerateNexusPlan = useCallback(async () => {
    if (!userId) return;

    setIsGeneratingPlan(true);
    try {
      const result = await nexusEngine.generatePlan(
        userId,
        `Помоги разработать материалы для Дня ${day}`,
        day
      );
      setNexusActions(result.actions);
      options?.onPlanGenerated?.({
        smartQuestsInserted: result.smartQuestsInserted,
        persistError: result.persistError,
        usedFallback: result.usedFallback,
      });
    } catch (e) {
      console.error('[useMissionNexus] Nexus plan generation failed', e);
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [userId, day, options?.onPlanGenerated]);

  const handleNexusExecute = useCallback(async (actionId: string) => {
    if (!userId) return;

    // Optimistic UI update to prevent double-click race (button disappears immediately)
    setNexusActions(prev =>
      prev.map(a =>
        a.id === actionId ? { ...a, status: 'executing' as const } : a
      )
    );

    try {
      const result = await nexusEngine.executeAction(actionId, userId);

      // Re-read authoritative state
      const updated = nexusEngine.getActionsForDay(userId, day);
      setNexusActions(updated);

      // Propagate failure to caller so AIMentor can show proper [❌] error + Retry
      if (!result.success) {
        const failedAction = updated.find(a => a.id === actionId);
        const errMsg = failedAction?.error || result.error || 'Execution failed';
        throw new Error(errMsg);
      }
    } catch (e: any) {
      console.error('[useMissionNexus] Execution failed', e);
      // Best-effort resync (in case optimistic state was wrong)
      try {
        const refreshed = nexusEngine.getActionsForDay(userId, day);
        setNexusActions(refreshed);
      } catch {}

      // Re-throw so the catch in AIMentor can show the error log + Retry button
      throw e;
    }
  }, [userId, day]);

  const handleNexusApprove = useCallback(async (actionId: string) => {
    if (!userId) return;

    try {
      await nexusEngine.approveAction(actionId, userId);
      const updated = nexusEngine.getActionsForDay(userId, day);
      setNexusActions(updated);
    } catch (e) {
      console.error('[useMissionNexus] Approve failed', e);
      try {
        const refreshed = nexusEngine.getActionsForDay(userId, day);
        setNexusActions(refreshed);
      } catch {}
    }
  }, [userId, day]);

  return {
    nexusActions,
    isGeneratingPlan,
    handleGenerateNexusPlan,
    handleNexusExecute,
    handleNexusApprove,
  };
}
