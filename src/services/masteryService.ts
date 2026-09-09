/**
 * CAISSA-CORE: STATE & MASTERY SUBSYSTEM
 * - O(d) client-side path reconstruction
 * - Synchronous local persistence with MMKV-compatible memory/localStorage store
 * - Asynchronous sync queue for background cloud synchronization (Supabase)
 */

import { supabase } from '../lib/supabase';

export interface MasteryRecord {
  status: 'UNSEEN' | 'LEARNING' | 'MASTERED';
  streak: number;
  lastPracticed: number; // Unix timestamp
}

export interface NodeData {
  id?: string;
  fen: string;
  san: string;
  parentFen: string | null;
  depth?: number;
  move?: string;
  name?: string;
  opening_id?: string;
  [key: string]: any;
}

// Simple deterministic hash for FEN strings to use in key names
function hashFen(fen: string): string {
  let hash = 0;
  for (let i = 0; i < fen.length; i++) {
    const char = fen.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

class MasteryStore {
  private cache: Map<string, MasteryRecord> = new Map();
  private syncQueue: Array<{
    opening_id: string;
    fen: string;
    status: 'UNSEEN' | 'LEARNING' | 'MASTERED';
    streak: number;
    last_practiced: number;
  }> = [];
  private isFlushing = false;

  constructor() {
    this.hydrateFromStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushSyncQueue();
        }
      });
      window.addEventListener('beforeunload', () => {
        this.flushSyncQueue();
      });
    }
  }

  private getKey(openingId: string, fen: string): string {
    const fenHash = hashFen(fen);
    return `mastery:${openingId || 'global'}:${fenHash}`;
  }

  private hydrateFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mastery:')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            this.cache.set(key, JSON.parse(raw));
          }
        }
      }
    } catch (e) {
      console.warn('[MASTERY_STORE] Failed to hydrate localStorage', e);
    }
  }

  public getMastery(openingId: string, fen: string): MasteryRecord {
    const key = this.getKey(openingId, fen);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const defaultRecord: MasteryRecord = {
      status: 'UNSEEN',
      streak: 0,
      lastPracticed: 0,
    };
    return defaultRecord;
  }

  public setMastery(
    openingId: string,
    fen: string,
    update: Partial<MasteryRecord>
  ): MasteryRecord {
    const key = this.getKey(openingId, fen);
    const prev = this.getMastery(openingId, fen);
    const next: MasteryRecord = {
      ...prev,
      ...update,
      lastPracticed: Date.now(),
    };

    this.cache.set(key, next);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch (e) {
        console.warn('[MASTERY_STORE] localStorage write error', e);
      }
    }

    // Push into sync queue
    this.syncQueue.push({
      opening_id: openingId || 'global',
      fen,
      status: next.status,
      streak: next.streak,
      last_practiced: next.lastPracticed,
    });

    return next;
  }

  public isFenMastered(openingId: string, fen: string): boolean {
    const record = this.getMastery(openingId, fen);
    return record.status === 'MASTERED';
  }

  public getAllMasteredFens(openingId?: string): Set<string> {
    const set = new Set<string>();
    const prefix = openingId ? `mastery:${openingId}:` : 'mastery:';

    this.cache.forEach((val, key) => {
      if (key.startsWith(prefix) && val.status === 'MASTERED') {
        // extract raw fen or hash
        set.add(key);
      }
    });

    return set;
  }

  public async flushSyncQueue(): Promise<void> {
    if (this.syncQueue.length === 0 || this.isFlushing || !supabase) return;
    this.isFlushing = true;

    const batch = [...this.syncQueue];
    this.syncQueue = [];

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        this.isFlushing = false;
        return;
      }

      const rows = batch.map(item => ({
        user_id: userId,
        opening_id: item.opening_id,
        fen: item.fen,
        status: item.status,
        streak: item.streak,
        last_practiced: new Date(item.last_practiced).toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('user_mastery').upsert(rows, {
        onConflict: 'user_id,opening_id,fen',
      });

      if (error) {
        console.warn('[MASTERY_STORE] Cloud sync deferred:', error.message);
        // Re-queue uncommitted mutations
        this.syncQueue.push(...batch);
      }
    } catch (err) {
      console.warn('[MASTERY_STORE] Sync queue network error', err);
      this.syncQueue.push(...batch);
    } finally {
      this.isFlushing = false;
    }
  }
}

export const masteryStore = new MasteryStore();

/**
 * MODULE 2.1: Client-Side O(depth) Path Reconstruction
 * Traces backward from target node to root in <= 30 iterations (< 0.05ms)
 */
export function resolveMoveSequence(targetFen: string, nodeMap: Map<string, NodeData>): string[] {
  const moves: string[] = [];
  let current = nodeMap.get(targetFen);
  let iterations = 0;

  while (current && current.san && iterations < 100) {
    let cleanSan = (current.san || current.move || current.name || '').trim();
    // Strip move number prefixes like "1.", "1...", "2. "
    cleanSan = cleanSan.replace(/^\d+\.?\s*\.\.\.\s*/, '').replace(/^\d+\.\.\.\s*/, '').replace(/^\d+\.\s*/, '').trim();

    if (cleanSan) {
      moves.unshift(cleanSan);
    }
    current = current.parentFen ? nodeMap.get(current.parentFen) : null;
    iterations++;
  }

  return moves;
}

/**
 * Reconstructs a standard clean PGN string from a target node
 */
export function resolvePgnString(targetFen: string, nodeMap: Map<string, NodeData>): string {
  const moves = resolveMoveSequence(targetFen, nodeMap);
  if (moves.length === 0) return '';

  const pgnMoves: string[] = [];
  let moveNumber = 1;
  for (let i = 0; i < moves.length; i++) {
    if (i % 2 === 0) {
      pgnMoves.push(`${moveNumber}. ${moves[i]}`);
    } else {
      pgnMoves.push(moves[i]);
      moveNumber++;
    }
  }
  return pgnMoves.join(' ');
}
