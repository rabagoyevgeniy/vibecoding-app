import { createClient } from '@/lib/supabase-browser';
import type { NexusSession, NexusAction } from './types';

/**
 * Nexus State Persistence Layer
 * 
 * Persists Nexus sessions to Supabase so that generated plans survive page refreshes.
 * 
 * IMPORTANT: This module is CLIENT-ONLY.
 * All functions guard against SSR to prevent "window is not defined" crashes
 * when NexusEngine is imported during server-side rendering (e.g. in API routes or page SSR).
 */

function getSupabaseClient() {
  if (typeof window === 'undefined') {
    // Running on server (SSR or API route) — do not use browser client
    console.warn('[Nexus Storage] Persistence skipped on server environment.');
    return null;
  }
  return createClient();
}

export interface NexusSessionRow {
  user_id: string;
  day: number;
  actions: NexusAction[];
  status?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Save or update a Nexus session for a user on a specific day.
 */
export async function saveNexusSession(
  userId: string, 
  day: number, 
  session: Partial<NexusSession>
): Promise<void> {
  if (!userId) return;

  const supabase = getSupabaseClient();
  if (!supabase) return; // Skip on server

  try {
    const payload: Partial<NexusSessionRow> = {
      user_id: userId,
      day,
      actions: session.actions || [],
      status: session.status || 'active',
      metadata: session.metadata || {},
    };

    const { error } = await supabase
      .from('vc_nexus_sessions')
      .upsert(payload, { 
        onConflict: 'user_id,day' 
      });

    if (error) {
      console.error('[Nexus Storage] Failed to save session:', error);
    }
  } catch (err) {
    console.error('[Nexus Storage] Exception while saving session:', err);
  }
}

/**
 * Load a Nexus session for a user on a specific day.
 * Returns null if no persisted session exists.
 */
export async function loadNexusSession(
  userId: string, 
  day: number
): Promise<NexusSession | null> {
  if (!userId) return null;

  const supabase = getSupabaseClient();
  if (!supabase) return null; // Skip on server

  try {
    const { data, error } = await supabase
      .from('vc_nexus_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('day', day)
      .single();

    if (error || !data) {
      return null;
    }

    // Reconstruct full NexusSession object
    return {
      id: data.id || `loaded-${userId}-${day}`,
      userId: data.user_id,
      day: data.day,
      goal: data.metadata?.goal || 'money',
      userIdea: data.metadata?.userIdea,
      status: (data.status as any) || 'active',
      actions: (data.actions as NexusAction[]) || [],
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString(),
      metadata: data.metadata || {},
    };
  } catch (err) {
    console.error('[Nexus Storage] Exception while loading session:', err);
    return null;
  }
}

/**
 * Delete a session (useful for reset or day completion).
 */
export async function deleteNexusSession(userId: string, day: number): Promise<void> {
  if (!userId) return;

  const supabase = getSupabaseClient();
  if (!supabase) return; // Skip on server

  try {
    await supabase
      .from('vc_nexus_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('day', day);
  } catch (err) {
    console.error('[Nexus Storage] Exception while deleting session:', err);
  }
}
