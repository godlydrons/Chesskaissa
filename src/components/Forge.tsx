import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from './Chessboard';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Terminal as TerminalIcon, 
  ChevronLeft,
  Activity,
  Flame,
  Skull,
  TrendingUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { soundEngine } from '../services/soundService';
import { useCaissaCache, CaissaPuzzle } from '../context/CaissaCacheContext';

interface ForgeProps {
  onBack: () => void;
  onAnalyze?: (pgn?: string, fen?: string) => void;
}

interface ForgeBoardWrapperProps {
  currentPuzzle: CaissaPuzzle;
  boardOrientation: 'white' | 'black';
  status: string;
  isBossNode: boolean;
  onCorrectMove: () => void;
  onIncorrectMove: (pgn?: string) => void;
  setIsWhiteTurn: (white: boolean) => void;
}

/**
 * ForgeBoardWrapper: Clean state container for a single puzzle attempt.
 * Completely unmounted and remounted on new puzzle load or failure reboot.
 */
function ForgeBoardWrapper({
  currentPuzzle,
  boardOrientation,
  status,
  isBossNode,
  onCorrectMove,
  onIncorrectMove,
  setIsWhiteTurn
}: ForgeBoardWrapperProps) {
  // Fresh Chess instantiation strictly inside the component (never shared)
  const [game] = useState(() => {
    const chessInstance = new Chess(currentPuzzle.FEN);
    const movesArray = currentPuzzle.Moves.split(' ');
    if (movesArray[0]) {
      try {
        const uci = movesArray[0].trim();
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.slice(4) || undefined;
        chessInstance.move({ from, to, promotion });
      } catch (err) {
        console.error("Auto-play blunder error inside ForgeBoardWrapper:", err);
      }
    }
    return chessInstance;
  });

  const [currentBoardFen, setCurrentBoardFen] = useState(() => game.fen());
  const [currentStepIndex, setCurrentStepIndex] = useState(1);
  const opponentTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync turn back to parent for UI indicator
  useEffect(() => {
    setIsWhiteTurn(game.turn() === 'w');
  }, [currentBoardFen, game, setIsWhiteTurn]);

  // Timeout Assassination: Clean up opponent response timer on unmount
  useEffect(() => {
    return () => {
      if (opponentTimeoutRef.current) {
        clearTimeout(opponentTimeoutRef.current);
      }
    };
  }, []);

  const onMove = (source: string, target: string) => {
    if (status !== 'ACTIVE' && status !== 'STAKE_PROMPT') return false;

    const moveSequence = currentPuzzle.Moves.split(' ');
    if (currentStepIndex >= moveSequence.length) return false;

    try {
      const testGame = new Chess(game.fen());
      const move = testGame.move({ from: source, to: target, promotion: 'q' });
      if (!move) return false;

      const playedUci = move.from + move.to + (move.promotion || '');
      const expectedMoveUci = moveSequence[currentStepIndex];

      if (playedUci === expectedMoveUci) {
        soundEngine.play(move.captured ? 'capture' : 'move');

        // Apply correct move
        game.move({ from: source, to: target, promotion: 'q' });
        const nextIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextIndex);
        setCurrentBoardFen(game.fen());

        if (nextIndex >= moveSequence.length) {
          onCorrectMove();
          return true;
        } else {
          // Play opponent response
          if (opponentTimeoutRef.current) {
            clearTimeout(opponentTimeoutRef.current);
          }
          opponentTimeoutRef.current = setTimeout(() => {
            const opponentMoveUci = moveSequence[nextIndex];
            try {
              const from = opponentMoveUci.slice(0, 2);
              const to = opponentMoveUci.slice(2, 4);
              const promotion = opponentMoveUci.slice(4) || undefined;
              const opMove = game.move({ from, to, promotion });
              if (opMove) {
                soundEngine.play(opMove.captured ? 'capture' : 'move');
                setCurrentBoardFen(game.fen());

                const afterOpponentIndex = nextIndex + 1;
                setCurrentStepIndex(afterOpponentIndex);

                if (afterOpponentIndex >= moveSequence.length) {
                  onCorrectMove();
                }
              }
            } catch (err) {
              console.error("Opponent response execution error:", err);
            }
          }, 300);
          return true;
        }
      } else {
        onIncorrectMove(game.pgn());
        return false;
      }
    } catch (e) {
      return false;
    }
  };

  return (
    <div className={cn(
       "absolute inset-0",
       status === 'TRANSITION' 
         ? "scale-110 opacity-0 blur-[4px] z-10 transition-all duration-150 pointer-events-none" 
         : "scale-100 opacity-100 blur-0 z-30 transition-none"
    )}>
      <Chessboard 
        key={currentPuzzle.PuzzleId}
        position={currentBoardFen}
        onMove={status === 'ACTIVE' || status === 'STAKE_PROMPT' ? onMove : () => {}}
        turn={game.turn() as any}
        isBlindMode={false}
        boardOrientation={boardOrientation}
      />
    </div>
  );
}

/**
 * CAISSA-CORE: THE FORGE (CACHE-INTEGRATED REDUX)
 * High-frequency sub-cortical training module powered by CaissaCacheContext.
 * Discards traditional page reloads for instant, double-buffered visual transitions.
 */
export function Forge({ onBack, onAnalyze }: ForgeProps) {
  const {
    activeQueue,
    currentPuzzle,
    nextPuzzle,
    shards: cachedShards,
    streak: cachedStreak,
    isLoading: cacheLoading,
    initializeCache,
    popActivePuzzle,
    incrementMetrics,
    resetStreak
  } = useCaissaCache();

  // --- LOCAL FORGE STATES ---
  const [unbankedShards, setUnbankedShards] = useState(0);
  const [status, setStatus] = useState<'LOADING' | 'ACTIVE' | 'TRANSITION' | 'STAKE_PROMPT' | 'FAILED'>('LOADING');
  const [isBossNode, setIsBossNode] = useState(false);
  const [bpm, setBpm] = useState(90);
  const [unlockedCosmetics, setUnlockedCosmetics] = useState<string[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isWhiteTurn, setIsWhiteTurn] = useState(true);
  const [failedPgn, setFailedPgn] = useState<string | null>(null);

  // Timeouts tracking for cleanup
  const correctTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const incorrectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Invert FEN color orientation: If active color is 'w', player is Black ('black'). If 'b', player is White ('white').
  const boardOrientation = useMemo<'white' | 'black'>(() => {
    if (!currentPuzzle?.FEN) return 'white';
    const activeColor = currentPuzzle.FEN.split(' ')[1];
    return activeColor === 'w' ? 'black' : 'white';
  }, [currentPuzzle]);

  // Reset attempt count on puzzle change
  useEffect(() => {
    setAttemptCount(0);
  }, [currentPuzzle?.PuzzleId]);

  // Hydrate Cache with Forge Puzzles on Mount
  useEffect(() => {
    const init = async () => {
      setStatus('LOADING');
      await initializeCache('Forge', 1500);
      setStatus('ACTIVE');
      soundEngine.startForgeMusic();
    };
    init();

    return () => {
      soundEngine.stopForgeMusic();
      if (correctTimeoutRef.current) clearTimeout(correctTimeoutRef.current);
      if (incorrectTimeoutRef.current) clearTimeout(incorrectTimeoutRef.current);
    };
  }, [initializeCache]);

  // Adjust BPM scaling based on active continuous streak
  useEffect(() => {
    const baseBpm = 90;
    const peakBpm = 125;
    const scale = Math.min((cachedStreak ?? 0) / 20, 1);
    const targetBpm = baseBpm + (peakBpm - baseBpm) * scale;
    setBpm(targetBpm);
    soundEngine.setForgeBPM(targetBpm);
  }, [cachedStreak]);

  // --- TRANSITION & EXTRACTION LOGIC ---
  const getPuzzleChallenge = (p: any) => {
    if (!p) return { fen: null, targetMove: null, turn: 'w' };
    try {
      const chess = new Chess(p.FEN);
      const moves = p.Moves.split(' ');
      if (moves[0]) chess.move(moves[0]);
      return {
        fen: chess.fen(),
        targetMove: moves[1],
        turn: chess.turn()
      };
    } catch (e) {
      return { fen: p?.FEN, targetMove: p?.Moves?.split(' ')[0], turn: 'w' };
    }
  };

  const nextChallenge = useMemo(() => getPuzzleChallenge(nextPuzzle), [nextPuzzle]);

  const handleCorrectMove = () => {
    const gain = isBossNode ? 500 : 100;
    
    // Increment shard cache optimistically
    setUnbankedShards(prev => prev + gain);
    incrementMetrics(0); // Boost current streak counter optimistically

    // Trigger double-buffered physics transition
    setStatus('TRANSITION');
    
    if (correctTimeoutRef.current) clearTimeout(correctTimeoutRef.current);
    correctTimeoutRef.current = setTimeout(() => {
      popActivePuzzle(); // Sub-millisecond CPU queue slide
      setStatus('ACTIVE');

      // If Boss Node was solved, apply rewards and multiply payload by 5x
      if (isBossNode) {
        setUnbankedShards(prev => prev * 5);
        setUnlockedCosmetics(prev => [...prev, 'Liquid_Gold_Aura_' + Math.floor(Math.random() * 1000)]);
        setIsBossNode(false);
        soundEngine.play('complete');
      }

      // Check for Stake opportunity every multiple of 5 on the counter
      if (((cachedStreak ?? 0) + 1) % 5 === 0) {
        setStatus('STAKE_PROMPT');
      }
    }, 150);
  };

  const handleIncorrectMove = (pgn?: string) => {
    soundEngine.play('fault');
    resetStreak();
    setUnbankedShards(0);
    setIsBossNode(false);
    setStatus('FAILED');
    setFailedPgn(pgn || null);

    if (incorrectTimeoutRef.current) clearTimeout(incorrectTimeoutRef.current);
    incorrectTimeoutRef.current = setTimeout(() => {
      setAttemptCount(prev => prev + 1);
      setStatus('ACTIVE');
    }, 800);
  };

  const bankShards = () => {
    // Commit unbanked shards to the permanent cache
    incrementMetrics(unbankedShards);
    setUnbankedShards(0);
    setStatus('ACTIVE');
    soundEngine.play('complete');
  };

  const stakeShards = () => {
    setIsBossNode(true);
    setStatus('ACTIVE');
    soundEngine.play('move');
  };

  const handleAnalyze = () => {
    const pgn = failedPgn || '';
    const fen = !failedPgn && activeQueue && activeQueue.length > 0 ? activeQueue[0].FEN : undefined;
    if (onAnalyze) {
      onAnalyze(pgn, fen);
    }
  };

  return (
    <div className={cn(
      "h-[100dvh] w-full bg-[#020617] text-slate-200 flex flex-col font-mono overflow-y-auto overflow-x-hidden select-none",
      unlockedCosmetics.length > 0 && "ring-4 ring-yellow-500/50 ring-inset"
    )}>
      {/* Background Data Scrawl */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden text-[8px] leading-none whitespace-pre select-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
            {`FORGE_TRACE_${i} >> EXPLOIT_VECTOR: ${Math.random().toString(16).slice(2)} >> CACHE_BUFFER_HEALTH: 100% >> ${Date.now()}`}
          </div>
        ))}
      </div>

      {/* Pulse Bar Delta */}
      <div className="h-[2px] w-full bg-slate-900 shrink-0 relative overflow-hidden">
        <motion.div 
          className="h-full bg-indigo-500 shadow-[0_0_15px_#6366f1]"
          initial={{ width: 0 }}
          animate={{ width: `${((cachedStreak ?? 0) % 5) * 20}%` }}
        />
        <div className="absolute right-0 top-0 px-2 text-[8px] font-black text-indigo-500 uppercase tracking-widest">
          Streak_Velocity: {(bpm ?? 90).toFixed(0)} BPM
        </div>
      </div>

      {/* Neural Header */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/5 border border-white/5 rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
            <h1 className="text-sm font-black tracking-[0.2em] uppercase">The_Forge_Core</h1>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest text-indigo-300">Unbanked_Payload</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-amber-400 animate-pulse">+{(unbankedShards ?? 0)}</span>
              <span className="text-lg font-black text-indigo-400">{(cachedShards ?? 0) + (unbankedShards ?? 0)}</span>
              <Activity className="w-3 h-3 text-indigo-500" />
            </div>
          </div>
          <div className="h-8 w-[1px] bg-white/5" />
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-indigo-500/50 uppercase tracking-widest">Streak_Pulse</span>
            <div className="flex items-center gap-2">
              <Flame className={cn("w-4 h-4", (cachedStreak ?? 0) > 0 ? "text-orange-500" : "text-slate-800")} />
              <span className="text-xl font-black italic">{(cachedStreak ?? 0)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Unlocked cosmetics ribbon */}
      {unlockedCosmetics.length > 0 && (
        <div className="bg-yellow-600/20 border-b border-yellow-500/35 px-6 py-1 flex items-center justify-between text-[8px] tracking-[0.2em] uppercase text-yellow-400 animate-pulse">
          <span>Rare_Aesthetic_Unlocked: {unlockedCosmetics[unlockedCosmetics.length - 1]}</span>
          <span className="font-bold">TITANIUM_PRESTIGE_ACTIVE</span>
        </div>
      )}

      <main className="flex-1 relative flex flex-col items-center justify-between md:justify-center w-full min-w-0 overflow-hidden p-4 pb-24 md:pb-4">
        {/* The Giga-Dev UI Badge */}
        {currentPuzzle && (
          <div className="mb-4">
            <div className={`px-4 py-2 font-mono text-sm font-bold tracking-widest uppercase rounded ${
              isWhiteTurn ? 'bg-white text-black font-black' : 'bg-zinc-900 text-white border border-zinc-700 font-black'
            }`}>
              {isWhiteTurn ? 'White to Move' : 'Black to Move'}
            </div>
          </div>
        )}

        {/* Kinetic Warp Container */}
        <div className="relative w-full max-w-[min(100%,45vh)] md:max-w-[500px] aspect-square shrink-0 my-auto">
          {(!activeQueue || activeQueue.length === 0 || !currentPuzzle) ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-900/40 border border-white/5 rounded-lg p-12">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] text-indigo-400 uppercase tracking-[0.2em] font-black">MEM_SHIFT_PULSE: ALIGNING_BUFFERS...</span>
            </div>
          ) : (
            <>
              {/* Shadow Board Layer */}
              <div className={cn(
                 "absolute inset-0 pointer-events-none",
                 status === 'TRANSITION' 
                    ? "scale-100 opacity-100 blur-0 z-20 transition-all duration-150" 
                    : "scale-90 opacity-10 blur-[2px] z-0 transition-none"
              )}>
                {nextChallenge.fen && (
                  <Chessboard 
                    key={`board-shadow-${nextChallenge.fen}`}
                    position={nextChallenge.fen}
                    onMove={() => {}}
                    turn={nextChallenge.turn as any}
                    isBlindMode={status !== 'TRANSITION'}
                    boardOrientation={boardOrientation}
                  />
                )}
              </div>

              {/* Active Board Layer with Strict Memory Cleanup and Key-based Remounting */}
              <ForgeBoardWrapper
                key={`${currentPuzzle.PuzzleId}-${attemptCount}`}
                currentPuzzle={currentPuzzle}
                boardOrientation={boardOrientation}
                status={status}
                isBossNode={isBossNode}
                onCorrectMove={handleCorrectMove}
                onIncorrectMove={handleIncorrectMove}
                setIsWhiteTurn={setIsWhiteTurn}
              />
            </>
          )}

          {/* Glitch Overlay (Failure) */}
          <AnimatePresence>
            {status === 'FAILED' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[100] bg-red-950/20 backdrop-blur-[2px] flex flex-col items-center justify-center p-8 border-4 border-red-500/50"
              >
                <Skull className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-black text-red-500 italic tracking-[0.3em]">STREAK_TERMINATED</h2>
                <div className="mt-4 text-[10px] text-red-400/60 font-mono animate-pulse mb-8">REBOOTING_SYSTEM_PULSE...</div>
                
                <div className="flex flex-col gap-4 w-full items-center">
                  <button 
                    onClick={() => setStatus('TRANSITION')}
                    className="px-12 py-4 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/50 font-black uppercase tracking-[0.3em] transition-all w-full max-w-[280px]"
                  >
                    Ack_Reboot
                  </button>
                  <button 
                    onClick={handleAnalyze}
                    className="px-12 py-3 bg-red-950 hover:bg-red-900 text-red-300 font-bold uppercase tracking-[0.2em] transition-all text-[10px] border border-red-500/20 w-full max-w-[280px]"
                  >
                    Analyze State
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stake Node UI */}
          <AnimatePresence>
            {status === 'STAKE_PROMPT' && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="absolute inset-[-20px] z-[120] bg-slate-950/95 border-4 border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.4)] flex flex-col items-center justify-center p-12 text-center"
              >
                <TrendingUp className="w-12 h-12 text-amber-400 mb-6" />
                <h2 className="text-3xl font-black text-amber-400 italic tracking-tighter mb-2">STAKE_OPPORTUNITY</h2>
                <p className="text-xs text-slate-400 mb-10 max-w-sm uppercase tracking-widest leading-relaxed">
                  Enter the <span className="text-amber-400 font-bold">Boss_Node</span>. Win to multiply unbanked shards by <span className="text-white font-bold">5x</span>. Fail to burn all unbanked metrics.
                </p>

                <div className="flex flex-col w-full gap-3">
                  <button 
                    onClick={stakeShards}
                    className="w-full py-5 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-[0.4em] transition-all active:scale-95"
                  >
                    Accept_Risk
                  </button>
                  <button 
                    onClick={bankShards}
                    className="w-full py-4 border border-white/10 hover:bg-white/5 text-slate-500 font-black uppercase tracking-[0.2em] transition-all active:scale-95"
                  >
                    Bank_Shards
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tactical Feed */}
        <div className="mt-12 w-full max-w-[calc(100vw-2rem)] md:max-w-[500px] flex justify-between items-end border-t border-white/5 pt-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">Live_Exploit_Log</span>
            <div className="flex items-center gap-3 text-xs font-black text-indigo-400">
              <TerminalIcon className="w-3 h-3" />
              <span>{isBossNode ? "BOSS_NODE_ACTIVE" : `OP_CODE_${(currentTimeCode()).toUpperCase()}`}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
             <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">Queue_Buffer</span>
             <span className="text-xs font-mono tabular-nums opacity-60">{activeQueue.length} Active / Cache buffered</span>
          </div>
        </div>
      </main>

      {/* Global Aesthetics */}
      <footer className="h-10 bg-slate-900/10 px-6 flex items-center justify-between border-t border-white/5">
        <div className="flex items-center gap-2 opacity-30 grayscale blur-[1px]">
          <Activity className="w-3 h-3" />
          <span className="text-[8px] uppercase tracking-widest">Neural_Sync: {bpm.toFixed(0)}ms_Latency</span>
        </div>
        <div className="text-[10px] text-slate-800 font-black italic">
          Forge_v3.double_buffered_cache.stable
        </div>
      </footer>
    </div>
  );
}

function currentTimeCode() {
  return Math.random().toString(16).slice(2, 8);
}
