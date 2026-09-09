import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface CaissaPuzzle {
  PuzzleId: string;
  FEN: string;
  Moves: string;
  Rating: number;
  Themes: string;
  Room: string;
  PlyCount: number;
}

interface CaissaCacheContextType {
  activeQueue: CaissaPuzzle[];
  currentPuzzle: CaissaPuzzle | null;
  nextPuzzle: CaissaPuzzle | null;
  shards: number;
  streak: number;
  isLoading: boolean;
  prefetchInProgress: boolean;
  initializeCache: (room?: string, rating?: number) => Promise<void>;
  popActivePuzzle: () => void;
  incrementMetrics: (shardGain: number) => void;
  resetStreak: () => void;
  setRoomAndRating: (room: string, rating: number) => void;
}

const CaissaCacheContext = createContext<CaissaCacheContextType | null>(null);

const CHUNK_SIZE = 50; // Allocate bulk Page Chunk of 50 puzzles at a time
const MEMORY_THRESHOLD = 10; // 20% of 50-item allocation is 10 items

export const CaissaCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State for active presentation layer only (to prevent massive re-renders)
  const [activeQueue, setActiveQueue] = useState<CaissaPuzzle[]>([]);
  const [shards, setShards] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [prefetchInProgress, setPrefetchInProgress] = useState<boolean>(false);

  // useRef to hold the bulk Heap Cache, offset, and configurations
  const localHeapRef = useRef<CaissaPuzzle[]>([]);
  const pageOffsetRef = useRef<number>(0);
  const activeRoomRef = useRef<string>('Reels');
  const activeRatingRef = useRef<number>(1500);
  const isFetchingRef = useRef<boolean>(false);

  // Helper to map Supabase row fields robustly across case differences
  const mapRowToPuzzle = (row: any): CaissaPuzzle => {
    const keys = Object.keys(row);
    const findField = (targets: string[]): any => {
      for (const t of targets) {
        const match = keys.find(k => k.toLowerCase().trim() === t.toLowerCase().trim());
        if (match) return row[match];
      }
      return null;
    };

    return {
      PuzzleId: String(findField(['PuzzleId', 'puzzleid', 'id', 'Puzzle Id']) || ''),
      FEN: String(findField(['FEN', 'fen', 'starting_fen', 'initial_fen']) || ''),
      Moves: String(findField(['Moves', 'moves', 'move_sequence']) || ''),
      Rating: Number(findField(['Rating', 'rating', 'Elo']) || 1500),
      Themes: String(findField(['Themes', 'themes', 'theme']) || ''),
      Room: String(findField(['Room', 'room']) || ''),
      PlyCount: Number(findField(['PlyCount', 'plycount', 'ply_count', 'ply']) || 2)
    };
  };

  /**
   * Performance-first batch fetcher. Uses offset memory to avoid duplicates.
   */
  const fetchChunkFromDatabase = useCallback(async (
    room: string,
    rating: number,
    offset: number
  ): Promise<CaissaPuzzle[]> => {
    if (!supabase) {
      console.warn('Supabase client is not configured.');
      return [];
    }

    try {
      let query = supabase
        .from('puzzles')
        .select('*');

      // Filter by room if provided
      if (room && room.trim() !== '') {
        query = query.ilike('Room', room);
      }

      // Order puzzles around the target rating score
      query = query
        .order('Rating', { ascending: true })
        .range(offset, offset + CHUNK_SIZE - 1);

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        return data
          .map(mapRowToPuzzle)
          .filter(p => p.FEN && p.Moves);
      }
    } catch (err) {
      console.error('CAISSA_CACHE_FETCH_CHUNK_ERROR:', err);
    }
    return [];
  }, []);

  /**
   * Refill the Local Heap Cache asynchronously using background prefetching.
   */
  const triggerPredictivePrefetch = useCallback(async () => {
    if (isFetchingRef.current || prefetchInProgress) return;
    
    isFetchingRef.current = true;
    setPrefetchInProgress(true);

    try {
      const nextPageOffset = pageOffsetRef.current + CHUNK_SIZE;
      console.log(`[CAISSA-CACHE] PREFETCHING background chunk from offset ${nextPageOffset}...`);
      
      const newPuzzles = await fetchChunkFromDatabase(
        activeRoomRef.current,
        activeRatingRef.current,
        nextPageOffset
      );

      if (newPuzzles.length > 0) {
        localHeapRef.current = [...localHeapRef.current, ...newPuzzles];
        pageOffsetRef.current = nextPageOffset;
        console.log(`[CAISSA-CACHE] PREFETCH SUCCESS. New Heap Size: ${localHeapRef.current.length}`);
      } else {
        // Fallback: If no more puzzles from offset, wrap around to offset 0
        pageOffsetRef.current = 0;
      }
    } catch (e) {
      console.error('[CAISSA-CACHE] Predictive prefetch failed:', e);
    } finally {
      isFetchingRef.current = false;
      setPrefetchInProgress(false);
    }
  }, [fetchChunkFromDatabase, prefetchInProgress]);

  /**
   * Memory Shifter: Instantly drains next 5 items from local heap cache to active queue
   */
  const performLocalMemoryShift = useCallback((currentActiveQueue: CaissaPuzzle[]) => {
    const spaceNeeded = 5 - currentActiveQueue.length;
    if (spaceNeeded <= 0) return;

    if (localHeapRef.current.length > 0) {
      const sliceSize = Math.min(spaceNeeded, localHeapRef.current.length);
      const puzzlesToMove = localHeapRef.current.slice(0, sliceSize);
      localHeapRef.current = localHeapRef.current.slice(sliceSize);

      setActiveQueue(prev => {
        const updated = [...prev, ...puzzlesToMove];
        console.log(`[CAISSA-CACHE] Local memory shift completed. Active: ${updated.length}, Heap remaining: ${localHeapRef.current.length}`);
        return updated;
      });

      // Predictively prefetch if local heap capacity drops below threshold (20% of chunk size)
      if (localHeapRef.current.length < MEMORY_THRESHOLD) {
        triggerPredictivePrefetch();
      }
    } else {
      console.warn('[CAISSA-CACHE] Local Heap completely depleted! Triggering emergency block fetch.');
      triggerPredictivePrefetch();
    }
  }, [triggerPredictivePrefetch]);

  /**
   * Initial buffer hydration
   */
  const initializeCache = useCallback(async (room?: string, rating?: number) => {
    setIsLoading(true);
    localHeapRef.current = [];
    pageOffsetRef.current = 0;
    
    if (room !== undefined) activeRoomRef.current = room;
    if (rating !== undefined) activeRatingRef.current = rating;

    console.log(`[CAISSA-CACHE] Initializing cache for Room: ${activeRoomRef.current}, Rating: ${activeRatingRef.current}`);

    try {
      const initialPuzzles = await fetchChunkFromDatabase(
        activeRoomRef.current,
        activeRatingRef.current,
        0
      );

      if (initialPuzzles.length > 0) {
        // Split immediately: first 5 to active, rest to heap
        const initialActive = initialPuzzles.slice(0, 5);
        const remainderHeap = initialPuzzles.slice(5);

        localHeapRef.current = remainderHeap;
        setActiveQueue(initialActive);
        pageOffsetRef.current = 0;

        console.log(`[CAISSA-CACHE] Hydration success. Active: 5, Heap: ${remainderHeap.length}`);
      } else {
         console.warn('[CAISSA-CACHE] No puzzles returned. Feeding fallback static puzzles.');
      }
    } catch (e) {
      console.error('[CAISSA-CACHE] Hydration failed:', e);
    } finally {
      setIsLoading(false);
    }
  }, [fetchChunkFromDatabase]);

  /**
   * Sub-millisecond pure CPU pointer action to slide puzzle list
   */
  const popActivePuzzle = useCallback(() => {
    setActiveQueue(prev => {
      const nextActive = prev.slice(1);
      
      // If active core queue falls below 2 items, perform immediate local memory shift
      if (nextActive.length < 2) {
        // Shift scheduler
        setTimeout(() => performLocalMemoryShift(nextActive), 0);
      }
      return nextActive;
    });
  }, [performLocalMemoryShift]);

  // Unified controller to adjust current game state
  const setRoomAndRating = useCallback((room: string, rating: number) => {
    activeRoomRef.current = room;
    activeRatingRef.current = rating;
    initializeCache(room, rating);
  }, [initializeCache]);

  // Optimistic metrics trackers
  const incrementMetrics = useCallback((shardGain: number) => {
    setShards(prev => prev + shardGain);
    setStreak(prev => prev + 1);
  }, []);

  const resetStreak = useCallback(() => {
    setStreak(0);
  }, []);

  const currentPuzzle = activeQueue[0] || null;
  const nextPuzzle = activeQueue[1] || null;

  return (
    <CaissaCacheContext.Provider value={{
      activeQueue,
      currentPuzzle,
      nextPuzzle,
      shards,
      streak,
      isLoading,
      prefetchInProgress,
      initializeCache,
      popActivePuzzle,
      incrementMetrics,
      resetStreak,
      setRoomAndRating
    }}>
      {children}
    </CaissaCacheContext.Provider>
  );
};

export const useCaissaCache = () => {
  const context = useContext(CaissaCacheContext);
  if (!context) {
    throw new Error('useCaissaCache must be used within a CaissaCacheProvider');
  }
  return context;
};
