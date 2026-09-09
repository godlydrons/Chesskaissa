import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from './Chessboard';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  ChevronLeft,
  Timer,
  Shield,
  AlertTriangle,
  Skull,
  TrendingDown,
  Trophy,
  Activity
} from 'lucide-react';
import { Settings, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { soundEngine } from '../services/soundService';
import { StockfishEngine, EngineEval } from '../services/engineService';

interface CruciblePuzzle {
  PuzzleId: string;
  FEN: string;
  Moves: string;
  Rating: number;
}

interface CrucibleProps {
  onBack: () => void;
  onBlunder?: () => void;
  puzzle?: CruciblePuzzle | null;
  onAnalyze?: (pgn?: string, fen?: string) => void;
}

export function Crucible({ onBack, onBlunder, puzzle: initialPuzzle, onAnalyze }: CrucibleProps) {
  // --- CORE STATE ---
  const [puzzle, setPuzzle] = useState<CruciblePuzzle | null>(initialPuzzle || null);
  const [game, setGame] = useState(new Chess());
  const [status, setStatus] = useState<'LOADING' | 'READY' | 'SCRAMBLE' | 'TERMINATED' | 'SUCCESS'>('LOADING');
  
  // Time controls
  const [showSettings, setShowSettings] = useState(false);
  const [initialTimeMs, setInitialTimeMs] = useState(30000);
  const [incrementMs, setIncrementMs] = useState(0);
  
  const [playerTime, setPlayerTime] = useState(30000);
  const [engineTime, setEngineTime] = useState(30000);
  const [evaluation, setEvaluation] = useState<EngineEval | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [titanCores, setTitanCores] = useState(0);

  // Turn detection & Board Orientation
  const isWhiteTurn = useMemo(() => {
    if (!puzzle?.FEN) return true;
    const activeColor = puzzle.FEN.split(' ')[1];
    return activeColor === 'w';
  }, [puzzle]);

  const boardOrientation = isWhiteTurn ? "white" : "black";

  const engineRef = useRef<StockfishEngine | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const heartbeatRef = useRef<boolean>(false);
  const lastMoveWasAlternativeRef = useRef<boolean>(false);
  
  // Refs for current state to avoid recreating engine
  const stateRef = useRef({ status, puzzle, game });
  useEffect(() => {
    stateRef.current = { status, puzzle, game };
  }, [status, puzzle, game]);

  // --- ENGINE SETUP ---
  useEffect(() => {
    engineRef.current = new StockfishEngine();
    
    engineRef.current.setEvaluationListener((ev) => {
      setEvaluation(ev);
    });

    engineRef.current.setMoveListener((move) => {
      const { status: currentStatus, game: currentGame } = stateRef.current;
      
      if (currentStatus === 'SCRAMBLE') {
        const newGame = new Chess(currentGame.fen());
        try {
          const from = move.substring(0, 2);
          const to = move.substring(2, 4);
          const promotion = move.substring(4) || undefined;
          
          const result = newGame.move({ from, to, promotion });
          if (result) {
            setGame(newGame);
            stateRef.current.game = newGame;
            soundEngine.play(result.captured ? 'capture' : 'move');
            setEngineTime(prev => prev + incrementMs);
            checkGameStatus(newGame, currentStatus);
          }
        } catch (e) {
          console.error("Move Error:", e); 
          console.error("ENGINE_MOVE_ERROR:", e);
        }
      }
    });

    return () => {
      engineRef.current?.terminate();
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []); // Run ONCE on mount

  // --- DATA FETCHING ---
  const fetchEndgame = useCallback(async () => {
    setStatus('LOADING');
    setTitanCores(0);
    setErrorMsg(null);
    setPlayerTime(initialTimeMs);
    setEngineTime(initialTimeMs);

    const fallbackPuzzles = [
      {
        PuzzleId: 'fallback_1',
        FEN: '8/8/8/8/8/1k6/p7/K7 w - - 0 1',
        Moves: 'b3c2',
        Rating: 1500
      },
      {
        PuzzleId: 'fallback_2',
        FEN: '8/8/8/8/8/5k2/5p2/5K2 b - - 0 1',
        Moves: 'f3e3',
        Rating: 1500
      },
      {
        PuzzleId: 'fallback_3',
        FEN: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
        Moves: 'e2e4',
        Rating: 1500
      }
    ];

    const startWithFallback = () => {
      const p = fallbackPuzzles[Math.floor(Math.random() * fallbackPuzzles.length)];
      const initialGame = new Chess(p.FEN);
      setPuzzle(p);
      setGame(initialGame);
      setStatus('READY');
    };

    if (!supabase) {
      startWithFallback();
      return;
    }

    try {
      // Query for endgame puzzles
      // Fetch random block of puzzles to avoid repetition
      const randomOffset = Math.floor(Math.random() * 5000);
      const { data, error } = await supabase
        .from('puzzles')
        .select('*')
        .ilike('Themes', '%endgame%')
        .range(randomOffset, randomOffset + 50);

      if (error) throw error;
      if (data && data.length > 0) {
        // Find endgame puzzles or fallback to any
        let suitable = data.filter(p => (p.Themes || '').toLowerCase().includes('endgame'));
        if (suitable.length === 0) suitable = data;
        
        // Exclude completed
        try {
          const completed = JSON.parse(localStorage.getItem('crucible_completed') || '[]');
          const uncompleted = suitable.filter(p => !completed.includes(p.PuzzleId || p.id));
          if (uncompleted.length > 0) {
            suitable = uncompleted;
          }
        } catch(e) {}
        
        const randomPuzzle = suitable[Math.floor(Math.random() * suitable.length)];
        
        // Deep mapping
        const findField = (row: any, targets: string[]) => {
          const keys = Object.keys(row);
          for (const t of targets) {
            const match = keys.find(k => k.toLowerCase().trim() === t.toLowerCase().trim());
            if (match) return row[match];
          }
          return null;
        };

        const normalized = {
          PuzzleId: findField(randomPuzzle, ['PuzzleId', 'puzzleid', 'id', 'Puzzle Id']),
          FEN: findField(randomPuzzle, ['FEN', 'fen', 'starting_fen', 'initial_fen', 'Starting FEN']),
          Moves: findField(randomPuzzle, ['Moves', 'moves', 'move_sequence']),
          Rating: parseInt(findField(randomPuzzle, ['Rating', 'rating', 'Elo', 'Difficulty']) || '1500', 10)
        };
        
        const initialGame = new Chess(normalized.FEN);
        // Play the opponent's blunder if there are moves, to reach the endgame position
        if (normalized.Moves) {
           const firstMove = normalized.Moves.split(' ')[0];
           try {
             initialGame.move({
               from: firstMove.substring(0, 2),
               to: firstMove.substring(2, 4),
               promotion: firstMove.length > 4 ? firstMove.substring(4) : undefined
             });
           } catch(e) {
             console.error("Failed to make initial move", e);
           }
        }
        
        // Update the FEN to the actual position the player starts from
        normalized.FEN = initialGame.fen();
        
        setPuzzle(normalized);
        setGame(initialGame);
        setStatus('READY');
      } else {
        startWithFallback();
      }
    } catch (err) {
      console.warn("CRUCIBLE_FETCH_ERROR:", err);
      startWithFallback();
    }
  }, [initialTimeMs]);

  useEffect(() => {
    fetchEndgame();
  }, [fetchEndgame, initialTimeMs]);

  // --- GAMEPLAY LOGIC ---
  const startScramble = () => {
    setStatus('SCRAMBLE');
    stateRef.current.status = 'SCRAMBLE';
    (window as any)._lastBeat = 0;
    (window as any)._tinnitusPlayed = false;
    lastTickRef.current = performance.now();
    timerRef.current = requestAnimationFrame(tick);
    soundEngine.play('complete');
  };

  const tick = (now: number) => {
    if (stateRef.current.status !== 'SCRAMBLE') return;

    const delta = now - lastTickRef.current;
    lastTickRef.current = now;
    
    // Only tick player's clock when it is their turn
    const playerSide = stateRef.current.puzzle ? new Chess(stateRef.current.puzzle.FEN).turn() : 'w';
    const isPlayerTurn = stateRef.current.game.turn() === playerSide;

    let nextPlayerTime = -1;
    let nextEngineTime = -1;

    if (isPlayerTurn) {
      setPlayerTime(prev => {
        nextPlayerTime = Math.max(0, prev - delta);
        return nextPlayerTime;
      });
    } else {
      setEngineTime(prev => {
        nextEngineTime = Math.max(0, prev - delta);
        return nextEngineTime;
      });
    }

    // Wait until state functions have run to do side-effects. 
    // In React 18 setState from requestAnimationFrame might be synchronous but the updater itself shouldn't have side effects.
    // Instead of risking updater scoping, we can just defer side effects.
    setTimeout(() => {
      if (nextPlayerTime !== -1) {
        if (nextPlayerTime < 15000 && stateRef.current.status === 'SCRAMBLE') {
          const beatInterval = nextPlayerTime < 5000 ? 300 : 800;
          const lastBeatTime = (window as any)._lastBeat || 0;
          if (now - lastBeatTime > beatInterval) {
            soundEngine.play('heartbeat');
            (window as any)._lastBeat = now;
          }
        }
        if (nextPlayerTime < 5000 && stateRef.current.status === 'SCRAMBLE') {
          const tinnitusPlayed = (window as any)._tinnitusPlayed || false;
          if (!tinnitusPlayed) {
            soundEngine.play('tinnitus');
            (window as any)._tinnitusPlayed = true;
          }
        }
        if (nextPlayerTime === 0 && stateRef.current.status === 'SCRAMBLE') {
          terminateGame("TEMPORAL_BREACH: TIME_EXPIRED");
        }
      }

      if (nextEngineTime === 0 && stateRef.current.status === 'SCRAMBLE') {
        handlePlayerWin();
      }
    }, 0);

    timerRef.current = requestAnimationFrame((n) => tick(n));
  };

  const handlePlayerWin = () => {
    setStatus('SUCCESS');
    stateRef.current.status = 'SUCCESS';
    setTitanCores(prev => prev + 1);
    
    // Save to local storage
    if (stateRef.current.puzzle) {
      try {
        const completed = JSON.parse(localStorage.getItem('crucible_completed') || '[]');
        completed.push(stateRef.current.puzzle.PuzzleId);
        localStorage.setItem('crucible_completed', JSON.stringify(completed));
      } catch(e) {}
    }
    soundEngine.play('success');
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
  };

  const terminateGame = (reason: string) => {
    setStatus('TERMINATED');
    stateRef.current.status = 'TERMINATED';
    setErrorMsg(reason);
    soundEngine.play('glitch');
    if (onBlunder) onBlunder();
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
  };

  const checkGameStatus = (currentGame: Chess, currentStatus: string) => {
    const currentPuzzle = stateRef.current.puzzle;
    const playerSide = currentPuzzle ? new Chess(currentPuzzle.FEN).turn() : 'w';

    
    if (currentGame.isCheckmate()) {
      if (currentGame.turn() !== playerSide) {
        handlePlayerWin();
      } else {
        terminateGame("CONVERSION_FAILED: CHECKMATED");
      }
    } else if (currentGame.isDraw()) {
      terminateGame("CONVERSION_FAILED: DRAW");
    } else {
      // If it's engine's turn, get move
      if (currentStatus === 'SCRAMBLE' && currentGame.turn() !== playerSide) {
         engineRef.current?.getBestMove(currentGame.fen());
      }
    }
  };

  const handleMove = (source: string, target: string) => {
    if (status !== 'READY' && status !== 'SCRAMBLE') return false;
    
    const currentPuzzle = stateRef.current.puzzle;
    const playerSide = currentPuzzle ? new Chess(currentPuzzle.FEN).turn() : 'w';
    if (game.turn() !== playerSide) return false;

    const testGame = new Chess(game.fen());
    try {
      const move = testGame.move({ from: source, to: target, promotion: 'q' });
      if (move) {
        setGame(testGame);
        stateRef.current.game = testGame;
        soundEngine.play(move.captured ? 'capture' : 'move');
        
        if (status === 'READY') {
          startScramble();
          checkGameStatus(testGame, 'SCRAMBLE');
        } else if (status === 'SCRAMBLE') {
          setPlayerTime(prev => prev + incrementMs);
          checkGameStatus(testGame, 'SCRAMBLE');
        }
        return true;
      }
    } catch (e) {
      console.error("Move Error:", e);
    }
    return false;
  };

  const formatTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    const seconds = Math.floor(totalSeconds);
    const milliseconds = Math.floor((totalSeconds - seconds) * 100);
    return `${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  // --- SENSORY EFFECT CALCULATIONS ---
  const vignetteOpacity = useMemo(() => {
    if (playerTime > 15000) return 0;
    return (15000 - playerTime) / 30000; // max around 0.5
  }, [playerTime]);

  const saturationClass = useMemo(() => {
    if (playerTime > 5000) return '';
    return 'grayscale-[0.5] contrast-[1.2]';
  }, [playerTime]);

  const renderMoveHistory = () => {
    const history = game.history();
    if (history.length === 0) return <div className="text-slate-600 italic">AWAITING_FIRST_MOVE...</div>;
    
    const fenParts = puzzle?.FEN.split(' ');
    const isBlackToMoveFirst = fenParts && fenParts[1] === 'b';
    let moveNum = fenParts ? parseInt(fenParts[5], 10) || 1 : 1;
    
    const elements = [];
    let i = 0;
    
    if (isBlackToMoveFirst) {
       elements.push(
         <span key="first" className="inline-block mr-4 mb-1">
           <span className="text-slate-500">{moveNum}.</span> ... <span className="text-white">{history[i]}</span>
         </span>
       );
       i++;
       moveNum++;
    }
    
    while (i < history.length) {
      elements.push(
        <span key={i} className="inline-block mr-4 mb-1">
          <span className="text-slate-500">{moveNum}.</span> <span className="text-white">{history[i]}</span> {history[i+1] ? <span className="text-slate-400">{history[i+1]}</span> : ''}
        </span>
      );
      i += 2;
      moveNum++;
    }
    
    return <div className="flex flex-wrap">{elements}</div>;
  };

  const handleAnalyze = () => {
    const pgn = game.pgn();
    if (onAnalyze) {
      onAnalyze(pgn);
    }
  };

  return (
    <div className={cn(
      "h-[100dvh] w-full bg-[#020617] text-slate-200 flex flex-col font-mono overflow-y-auto overflow-x-hidden select-none transition-all duration-1000",
      titanCores > 0 && "ring-[12px] ring-slate-100/10 ring-inset",
      playerTime < 5000 && "bg-[#050505]"
    )}>
      {/* Titanium Border (Prestige UI) */}
      {titanCores > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[200] border-[1px] border-white/20 shadow-[inset_0_0_100px_rgba(255,255,255,0.05)]" />
      )}

      {/* Sensory Overload: Tunnel Vision */}
      <div 
        className="fixed inset-0 pointer-events-none z-[100] transition-opacity duration-300"
        style={{ 
          background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${vignetteOpacity * 2.5}) 100%)`,
          opacity: status === 'SCRAMBLE' ? 1 : 0
        }}
      />

      {/* Header */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-3 sm:px-6 bg-slate-950/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2 sm:gap-6">
          <button 
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/5 border border-white/5 rounded transition-colors cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Shield className="w-4 h-4 text-slate-400 shrink-0" />
            <h1 className="text-xs sm:text-sm font-black tracking-[0.1em] sm:tracking-[0.2em] uppercase truncate max-w-[140px] xs:max-w-[180px] sm:max-w-none">The_Crucible</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-1.5 sm:p-2 border border-slate-800 hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
           <div className="flex flex-col items-end">
            <span className="text-[8px] sm:text-[9px] text-slate-500 uppercase tracking-widest">Titan_Cores</span>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg font-black text-slate-100">{titanCores}</span>
              <Zap className={cn("w-3 h-3 transition-colors", titanCores > 0 ? "text-yellow-400" : "text-slate-800")} />
            </div>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-[#050505] border border-slate-800 p-8 w-full max-w-md relative">
              <button 
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-xl font-black uppercase tracking-widest text-white mb-6">Time_Controls</h2>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "1/2 + 0", time: 30000, inc: 0 },
                  { label: "1 + 0", time: 60000, inc: 0 },
                  { label: "1 + 1", time: 60000, inc: 1000 },
                  { label: "2 + 1", time: 120000, inc: 1000 },
                  { label: "3 + 0", time: 180000, inc: 0 },
                  { label: "3 + 2", time: 180000, inc: 2000 },
                  { label: "5 + 0", time: 300000, inc: 0 },
                  { label: "5 + 3", time: 300000, inc: 3000 }
                ].map((tc, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInitialTimeMs(tc.time);
                      setIncrementMs(tc.inc);
                      setShowSettings(false);
                      if (status === 'READY') {
                         setPlayerTime(tc.time);
                         setEngineTime(tc.time);
                      }
                    }}
                    className={cn(
                      "py-4 border text-center transition-all",
                      initialTimeMs === tc.time && incrementMs === tc.inc
                        ? "bg-white text-black font-black border-white"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white"
                    )}
                  >
                    <span className="font-mono text-lg font-bold">{tc.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 relative flex flex-col items-center justify-between md:justify-center w-full min-w-0 overflow-hidden p-3 sm:p-4 pb-28 md:pb-4">
        {/* Scramble Clocks */}
        <div className="mb-3 sm:mb-4 flex gap-4 sm:gap-8 items-center">
          {/* Engine Clock */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Engine_Clock</span>
            <div className={cn(
              "text-3xl font-black tabular-nums tracking-tighter",
              engineTime < 5000 ? "text-red-500 animate-pulse" : "text-slate-300"
            )}>
              {formatTime(engineTime)}
            </div>
          </div>
          
          <div className="h-10 w-px bg-white/10" />

          {/* Player Clock */}
          <div className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300",
            playerTime < 5000 && "scale-110",
            playerTime < 2000 && "animate-pulse"
          )}>
            <div className="flex items-center gap-2 text-slate-500 mb-1">
               <Timer className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">Player_Clock</span>
            </div>
            <div className={cn(
              "text-4xl font-black tabular-nums tracking-tighter",
              playerTime < 5000 ? "text-red-500" : "text-white"
            )}>
              {formatTime(playerTime)}
            </div>
          </div>
        </div>

        {/* The Giga-Dev UI Badge */}
        {puzzle && (
          <div className="mb-4">
            <div className={`px-4 py-2 font-mono text-sm font-bold tracking-widest uppercase rounded ${
              isWhiteTurn ? 'bg-white text-black font-black' : 'bg-zinc-900 text-white border border-zinc-700 font-black'
            }`}>
              {isWhiteTurn ? 'White to Move' : 'Black to Move'}
            </div>
          </div>
        )}

        {/* The Board */}
        <div className={cn(
          "relative w-full max-w-[calc(100vw-2rem)] md:max-w-[500px] aspect-square transition-all shrink-0 duration-300",
          saturationClass,
          status === 'TERMINATED' && "scale-95 grayscale"
        )}>
          {puzzle && (
            <Chessboard 
              key={puzzle.PuzzleId + (status === 'LOADING' ? 'loading' : 'active')}
              position={game.fen()}
              onMove={handleMove}
              boardOrientation={boardOrientation}
              turn={game.turn()}
            />
          )}

          {/* Status Overlays */}
          <AnimatePresence>
            {status === 'TERMINATED' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-[-10px] z-[120] bg-red-950/40 backdrop-blur-md border-4 border-red-500 flex flex-col items-center justify-center p-12 text-center"
              >
                <Skull className="w-16 h-16 text-red-500 mb-6 animate-bounce" />
                <h2 className="text-3xl font-black text-red-400 italic tracking-tighter mb-4 uppercase">{errorMsg || "CONVERSION_FAILED"}</h2>
                <div className="bg-red-500/20 px-4 py-2 border border-red-500/50 text-[10px] text-red-400 font-bold tracking-widest mb-8">
                  EVALUATION_DROP_DETECTED
                </div>
                <div className="flex flex-col gap-4 w-full items-center">
                  <button 
                    onClick={fetchEndgame}
                    className="px-12 py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-[0.3em] transition-all w-full max-w-[280px]"
                  >
                    Regenerate_State
                  </button>
                  <button 
                    onClick={handleAnalyze}
                    className="px-12 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-[0.2em] transition-all text-[10px] border border-white/5 w-full max-w-[280px]"
                  >
                    Analyze State
                  </button>
                </div>
              </motion.div>
            )}

            {status === 'SUCCESS' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-[-10px] z-[120] bg-slate-950/90 backdrop-blur-md border-4 border-slate-100 shadow-[0_0_50px_rgba(255,255,255,0.3)] flex flex-col items-center justify-center p-12 text-center"
              >
                <Trophy className="w-16 h-16 text-slate-100 mb-6" />
                <h2 className="text-4xl font-black text-white italic tracking-tighter mb-2 italic">FLAWLESS_CONVERSION</h2>
                {playerTime > 10000 && (
                  <div className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest mb-2 animate-pulse">SPEED_CONVERSION_OVERRIDE</div>
                )}
                <div className="text-[10px] text-slate-400 uppercase tracking-[0.4em] mb-10">
                  Titan_Core_Yield: <span className="text-white">+1</span>
                </div>
                <div className="flex flex-col gap-4 w-full items-center">
                  <button 
                    onClick={fetchEndgame}
                    className="px-12 py-4 bg-white text-black font-black uppercase tracking-[0.3em] transition-all hover:bg-slate-200 w-full max-w-[280px]"
                  >
                    Next_Crucible
                  </button>
                  <button 
                    onClick={handleAnalyze}
                    className="px-12 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-[0.2em] transition-all text-[10px] border border-white/5 w-full max-w-[280px]"
                  >
                    Analyze State
                  </button>
                </div>
              </motion.div>
            )}
            
            {status === 'READY' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute top-4 left-4 right-4 z-50 pointer-events-none"
              >
                <div className="bg-indigo-600/90 px-4 py-2 text-[10px] font-black text-white uppercase tracking-[0.2em] inline-flex items-center gap-3">
                  <Activity className="w-3 h-3 animate-pulse" />
                  Convert the endgame before time expires.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live Eval Log */}
        <div className="mt-12 w-full max-w-[calc(100vw-2rem)] md:max-w-[500px] flex flex-col gap-4">
           <div className="flex justify-between items-end pt-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">Realtime_Engine_Eval</span>
              <div className={cn(
                "flex items-center gap-3 text-xs font-black",
                evaluation?.score && evaluation.score > 200 ? "text-emerald-400" : "text-red-400"
              )}>
                <AlertTriangle className="w-3 h-3" />
                <span>{evaluation ? `EVAL: ${evaluation.type === 'cp' ? (evaluation.score / 100).toFixed(2) : `M${evaluation.score}`}` : 'LINKING_STOCKFISH...'}</span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1">
               <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">Threat_Level</span>
               <span className="text-xs font-mono tabular-nums text-red-500 font-bold">STOCKFISH_LVL_20</span>
            </div>
          </div>
          
          {/* Match History */}
          <div className="flex flex-col gap-1">
             <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">Match_History</span>
             <div className="bg-black/40 border border-white/5 p-3 rounded h-24 overflow-y-auto font-mono text-[10px] text-slate-300 leading-relaxed shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
               {renderMoveHistory()}
             </div>
          </div>

          {/* Terminal Feed Simulation */}
          <div className="bg-black/40 border border-white/5 p-3 rounded h-24 overflow-hidden flex flex-col-reverse font-mono text-[9px] text-slate-600 leading-relaxed">
             <div>{`>> STOCKFISH_READY: THREADS=4 HASH=128MB`}</div>
             <div>{`>> INGEST_FEN: ${puzzle?.FEN?.substring(0, 40)}...`}</div>
             <div>{`>> SCRAMBLE_ENGINE_LOADED: WASM_VERSION=1.0`}</div>
             {status === 'SCRAMBLE' && <div>{`>> WARNING: TEMPORAL_STRESS_ACTIVE`}</div>}
             {status === 'TERMINATED' && <div className="text-red-500">{`>> CRITICAL_FAIL: ${errorMsg}`}</div>}
          </div>
        </div>
      </main>

      {/* Global Aesthetics */}
      <footer className="h-10 bg-slate-900/10 px-6 flex items-center justify-between border-t border-white/5">
        <div className="flex items-center gap-2 opacity-30">
          <Activity className="w-3 h-3" />
          <span className="text-[8px] uppercase tracking-widest">Engine_Sync: {evaluation?.depth || 0}d_Depth</span>
        </div>
        <div className="text-[10px] text-slate-800 font-black italic">
          Crucible_v1.endgame_scramble.local
        </div>
      </footer>
    </div>
  );
}
