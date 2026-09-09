import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from './Chessboard';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Terminal as TerminalIcon, 
  RefreshCcw, 
  CheckCircle2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { soundEngine } from '../services/soundService';

/**
 * CAISSA-CORE: BLINDFOLD GYM (HARD RESET)
 * Optimized for spatial repetition and visualization.
 */
export function BlindfoldGym({ onBack, onAnalyze }: { onBack: () => void, onAnalyze?: (pgn?: string, fen?: string) => void }) {
  const [puzzle, setPuzzle] = useState<any>(null);
  const [baseDepth, setBaseDepth] = useState(3);
  const [autoScale, setAutoScale] = useState(true);
  const [streak, setStreak] = useState(0);
  
  const blindfoldDepth = autoScale ? baseDepth + Math.floor(streak / 2) : baseDepth;
  
  const [status, setStatus] = useState<'LOADING' | 'ACTIVE' | 'SUCCESS' | 'FAILED' | 'REVEALING'>('LOADING');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [terminalValue, setTerminalValue] = useState("");
  const [revelationFen, setRevelationFen] = useState<string | null>(null);
  const [highlightedSquares, setHighlightedSquares] = useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [blindfoldRating, setBlindfoldRating] = useState(1000);

  // Core Data Retrieval via Supabase
  const fetchPuzzle = useCallback(async () => {
    setStatus('LOADING');
    setErrorStatus(null);
    setTerminalValue("");
    setRevelationFen(null);
    setHighlightedSquares([]);
    
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('puzzles')
        .select('*')
        .ilike('Room', 'Blindfold')
        .limit(100);

      if (error) throw error;
      if (!data || data.length === 0) {
        setErrorStatus("DB_EMPTY");
        setStatus('FAILED');
        return;
      }

      // DEEP MAPPING: Handle casing, whitespace, and variants
      const findField = (row: any, targets: string[]) => {
        const keys = Object.keys(row);
        for (const t of targets) {
          const match = keys.find(k => k.toLowerCase().trim() === t.toLowerCase().trim());
          if (match) return row[match];
        }
        return null;
      };

      const normalizedList = data.map(row => ({
        PuzzleId: findField(row, ['PuzzleId', 'puzzleid', 'id', 'Puzzle Id']),
        FEN: findField(row, ['FEN', 'fen', 'starting_fen', 'initial_fen', 'Starting FEN', 'FEN ']),
        Moves: findField(row, ['Moves', 'moves', 'move_sequence', 'Moves ', 'Sequence']),
        Rating: parseInt(findField(row, ['Rating', 'rating', 'Elo', 'Difficulty']) || '1000', 10)
      }));

      // Filter puzzles that are at least long enough for our depth
      let suitablePuzzles = normalizedList.filter(p => p.Moves && p.Moves.split(' ').length > blindfoldDepth);
      
      if (suitablePuzzles.length === 0) {
        suitablePuzzles = normalizedList; // Fallback to all if none are long enough
      }

      // Sort by how close they are to current rating
      suitablePuzzles.sort((a, b) => Math.abs(a.Rating - blindfoldRating) - Math.abs(b.Rating - blindfoldRating));

      // Pick from the top 5 closest matches
      const topMatches = suitablePuzzles.slice(0, 5);
      const selected = topMatches[Math.floor(Math.random() * topMatches.length)];

      console.log("Supabase Normalized Puzzle:", selected);
      setPuzzle(selected);
      setStatus('ACTIVE');
    } catch (err: any) {
      console.warn(err);
      setErrorStatus("SYNC_ERROR");
      setStatus('FAILED');
    }
  }, [blindfoldDepth, blindfoldRating]);

  useEffect(() => {
    fetchPuzzle();
  }, [fetchPuzzle]);

  useEffect(() => {
    if (status === 'ACTIVE' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [status]);

  // Direct-Drive FEN Resolution
  const startingFen = useMemo(() => {
    if (!puzzle?.FEN) return null;
    const raw = puzzle.FEN.trim();
    return raw.toLowerCase() === 'start' ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : raw;
  }, [puzzle]);

  // Visual Position Object Resolver (Bypasses library FEN parsing issues)
  const visualPosition = useMemo(() => {
    if (!startingFen) return 'start';
    try {
      const chess = new Chess(startingFen);
      const board = chess.board();
      const pos: any = {};
      const colMap = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      
      board.forEach((row, rIdx) => {
        row.forEach((cell, cIdx) => {
          if (cell) {
            const square = `${colMap[cIdx]}${8 - rIdx}`;
            pos[square] = `${cell.color}${cell.type.toUpperCase()}`;
          }
        });
      });
      return pos;
    } catch (e) {
      return startingFen; // Fallback to FEN if object map fails
    }
  }, [startingFen]);

  const moveSequence = useMemo(() => puzzle?.Moves?.split(' ') || [], [puzzle]);
  const actualDepth = useMemo(() => {
    if (moveSequence.length === 0) return 3;
    return Math.max(1, Math.min(blindfoldDepth, moveSequence.length - 1));
  }, [blindfoldDepth, moveSequence]);
  
  const targetMoveUci = moveSequence[actualDepth]; // The actual target move

  // The "Mental" state after actualDepth moves
  const mentalState = useMemo(() => {
    if (!startingFen || moveSequence.length <= actualDepth) return null;
    const chess = new Chess(startingFen);
    moveSequence.slice(0, actualDepth).forEach(m => {
      try { chess.move(m); } catch (e) {}
    });
    return {
      fen: chess.fen(),
      turn: chess.turn()
    };
  }, [startingFen, moveSequence, actualDepth]);

  // UCI to SAN Visualization Logic
  const sanMovesString = useMemo(() => {
    if (!puzzle || !startingFen) return "";
    const chess = new Chess(startingFen);
    let out = "";
    const intro = moveSequence.slice(0, actualDepth);
    
    // STRICT FIX: Always start training at move 1
    let moveNum = 1;
    let turn = chess.turn();

    if (turn === 'b') out += "1... ";

    intro.forEach((m: string) => {
      try {
        const move = chess.move(m);
        if (turn === 'w') {
          out += `${moveNum}. ${move.san} `;
          turn = 'b';
        } else {
          out += `${move.san} `;
          moveNum++;
          turn = 'w';
        }
      } catch (e) {
        // Log illegal moves for deep debugging
        console.error(`ILLEGAL_MOVE_DETECTED: move ${m} is illegal for FEN ${chess.fen()}`);
        out += `[ERR:${m}] `; 
      }
    });
    return out.trim();
  }, [puzzle, startingFen, moveSequence]);

  // User Interaction Logic: MENTAL_SIGHT_VALIDATION
  const validateMove = (moveData: { from?: string, to?: string, san?: string }) => {
    if (status !== 'ACTIVE' || !targetMoveUci || !startingFen) return false;

    // 1. Internal Engine B (Mental): Load initial state and execute first actualDepth moves
    const mentalChess = new Chess(startingFen);
    moveSequence.slice(0, actualDepth).forEach((m: string) => {
      try { mentalChess.move(m); } catch (e) {}
    });

    try {
      let playedUci = "";
      let isCapture = false;

      if (moveData.san) {
        // Validation via SAN string (case-insensitive)
        let move = null;
        const sanList = [
          moveData.san,
          moveData.san.charAt(0).toUpperCase() + moveData.san.slice(1).toLowerCase(),
          moveData.san.toLowerCase(),
          moveData.san.replace(/0/g, 'O').toUpperCase() // For O-O
        ];
        
        for (const sanStr of sanList) {
          try {
            move = mentalChess.move(sanStr);
            if (move) break;
          } catch(e) {}
        }
        
        if (move) {
          playedUci = move.from + move.to + (move.promotion || '');
          isCapture = !!move.captured;
        }
      } else if (moveData.from && moveData.to) {
        // Validation via Drag/Drop on the mental position
        const expectedFrom = targetMoveUci.substring(0, 2);
        const expectedTo = targetMoveUci.substring(2, 4);

        if (moveData.from === expectedFrom && moveData.to === expectedTo) {
          playedUci = targetMoveUci;
          const targetPiece = mentalChess.get(expectedTo as any);
          isCapture = !!targetPiece;
        }
      }

      if (playedUci === targetMoveUci) {
        if (isCapture) {
          soundEngine.play('capture');
        } else {
          soundEngine.play('move');
        }

        setTimeout(() => soundEngine.play('success'), 300);
        setStatus('SUCCESS');
        setBlindfoldRating(r => r + 20); // Increase rating on success
        setStreak(s => s + 1);
        return true; 
      } else {
        soundEngine.play('fault');
        setErrorStatus("RETRY");
        setStatus('FAILED');
        setTerminalValue("");
        setBlindfoldRating(r => Math.max(100, r - 20)); // Decrease rating on failure
        setStreak(0);
        setTimeout(() => {
          setStatus('ACTIVE');
          setErrorStatus(null);
          inputRef.current?.focus();
        }, 1500);
        return false; 
      }
    } catch (e) {
      soundEngine.play('fault');
      setErrorStatus("RETRY");
      setStatus('FAILED');
      setTerminalValue("");
      setTimeout(() => {
        setStatus('ACTIVE');
        setErrorStatus(null);
        inputRef.current?.focus();
      }, 1500);
      return false;
    }
  };

  const handleMove = (source: string, target: string) => {
    return validateMove({ from: source, to: target });
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalValue.trim()) return;
    validateMove({ san: terminalValue.trim() });
  };

  const revealSolution = async () => {
    if (!startingFen || moveSequence.length < actualDepth + 1 || status === 'REVEALING') return;
    
    setStatus('REVEALING');
    const chess = new Chess(startingFen);
    setRevelationFen(chess.fen());
    setHighlightedSquares([]);
    
    // Step 1: Play Intro Moves (700ms delay)
    const intro = moveSequence.slice(0, actualDepth);
    for (const m of intro) {
      await new Promise(r => setTimeout(r, 700));
      const move = chess.move(m);
      setRevelationFen(chess.fen());
      if (move && move.captured) {
        soundEngine.play('capture');
      } else {
        soundEngine.play('move');
      }
    }

    // Step 2: Visual Pause at Mental Position (1.5s)
    await new Promise(r => setTimeout(r, 1500));

    // Step 3: Reveal Answer
    const answer = moveSequence[actualDepth];
    if (answer) {
      try {
        const move = chess.move(answer);
        if (move) {
          setRevelationFen(chess.fen());
          setHighlightedSquares([move.from, move.to]);
          if (move.captured) {
            soundEngine.play('capture');
          } else {
            soundEngine.play('move');
          }
          setTimeout(() => soundEngine.play('complete'), 300);
        }
      } catch (e) {
        console.error("Answer reveal error:", e);
      }
    }

    // Stop auto-reset to allow user to see answer
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-200 flex flex-col font-mono overflow-hidden select-none">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-4">
          <Zap className="w-5 h-5 text-indigo-400 rotate-12" />
          <h1 className="text-xl font-black tracking-tighter uppercase">BLINDFOLD_GYM</h1>
        </div>
        <button 
          onClick={onBack}
          className="px-4 py-2 border border-slate-800 hover:bg-slate-800 text-xs uppercase tracking-widest"
        >
          [ EXIT ]
        </button>
      </header>

      <main className="flex-1 flex flex-col md:flex-row min-w-0 overflow-hidden">
        {/* Left: Tactical Grid */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-2 md:p-6 lg:p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950 w-full overflow-hidden">
          
          {/* Debug Label */}
          <div className="flex gap-2 mb-4">
            <div className={cn(
              "px-4 py-1 text-[10px] font-black rounded border whitespace-nowrap",
              startingFen ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-red-500/10 border-red-500/30 text-red-500"
            )}>
              DEBUG: {startingFen ? 'DATA OK' : 'DATA NULL'}
            </div>
            {startingFen && (
              <div className="px-4 py-1 text-[10px] font-mono rounded border bg-slate-900 border-slate-800 text-slate-500 overflow-hidden text-ellipsis max-w-[200px]">
                FEN: {startingFen.substring(0, 20)}...
              </div>
            )}
          </div>

          <div className="w-full max-w-[min(100%,40vh)] md:max-w-[550px] aspect-square shrink-0 relative shadow-[0_0_100px_rgba(0,0,0,0.4)] border-8 border-slate-900 rounded-sm overflow-hidden bg-slate-900">
            {/* FEN HOLOGRAM / VISUAL DEBUG */}
            {startingFen && (
              <div className="absolute top-0 left-0 z-50 bg-red-600 text-white text-[8px] px-2 py-0.5 font-mono pointer-events-none opacity-80 max-w-full break-all">
                LITERAL_FEN: {startingFen}
              </div>
            )}
            
            {/* DIRECT-DRIVE BOARD: key={ID+FEN} ensures absolute fresh state */}
            {startingFen ? (
              <Chessboard 
                key={`${puzzle?.PuzzleId}-${startingFen}-${revelationFen || ''}`}
                position={revelationFen || startingFen}
                interactionPosition={status === 'ACTIVE' && !revelationFen ? mentalState?.fen : undefined}
                onMove={handleMove}
                orientation={new Chess(startingFen).turn() === 'w' ? 'w' : 'b'}
                turn={mentalState?.turn || (new Chess(startingFen).turn() as 'w' | 'b')}
                highlightSquares={highlightedSquares}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-700 uppercase tracking-widest">
                Awaiting_Visual_Matrix...
              </div>
            )}

            <AnimatePresence>
              {(status === 'SUCCESS' || highlightedSquares.length > 0) && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-indigo-600/10 backdrop-blur-[2px] flex items-center justify-center pointer-events-auto"
                >
                  <div className="bg-slate-900/90 p-8 border-2 border-indigo-500 shadow-2xl flex flex-col items-center gap-6 min-w-[280px]">
                    {status === 'SUCCESS' ? (
                      <>
                        <CheckCircle2 className="w-16 h-16 text-indigo-400" />
                        <h2 className="text-4xl font-black italic text-white tracking-widest">SUCCESS</h2>
                      </>
                    ) : (
                      <>
                        <Zap className="w-16 h-16 text-yellow-400" />
                        <h2 className="text-xl font-black italic text-white tracking-widest uppercase">SOLUTION_REVEALED</h2>
                      </>
                    )}
                    
                    <div className="flex flex-col gap-2 w-full">
                      <button 
                        onClick={() => {
                          fetchPuzzle();
                        }}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all"
                      >
                        <RefreshCcw className="w-4 h-4" />
                        Next_Node
                      </button>
                      
                      <button 
                        onClick={() => {
                          if (onAnalyze) {
                            onAnalyze('', revelationFen || mentalState?.fen || startingFen || undefined);
                          }
                        }}
                        className="w-full py-3 border border-indigo-500/30 bg-slate-900 hover:bg-slate-800 text-indigo-400 font-bold uppercase tracking-[0.1em] text-xs transition-all"
                      >
                        Analyze State
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {status === 'LOADING' && (
              <div className="absolute inset-0 bg-slate-950/90 flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          
          {/* Deep Trace Log Footer */}
          {puzzle && (
            <div className="mt-8 p-4 border border-slate-900 bg-slate-950 rounded text-[9px] font-mono text-slate-600">
              <span className="text-indigo-900 mr-2 uppercase">DEBUG_STATE:</span>
              ID:{puzzle.PuzzleId} | FEN:{startingFen}
            </div>
          )}
        </div>

        {/* Right: Terminal */}
        <div className="h-[50vh] md:h-auto w-full md:w-[320px] lg:w-[450px] bg-slate-950 border-t md:border-t-0 md:border-l border-slate-800 p-4 md:p-8 lg:p-10 flex flex-col space-y-4 md:space-y-8 overflow-y-auto shrink-0 min-w-0">
          <div className="flex gap-4">
            <div className="flex-1 bg-slate-900 border border-slate-800 p-4">
              <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Current Streak</div>
              <div className="text-2xl font-black text-white">{streak}</div>
            </div>
            <div className="flex-1 bg-slate-900 border border-slate-800 p-4">
              <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Target Depth</div>
              <div className="text-2xl font-black text-indigo-400">{blindfoldDepth}</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="text-xs uppercase font-black tracking-wider text-slate-400">Auto-Scale Depth</div>
              <button
                onClick={() => setAutoScale(a => !a)}
                className={`px-3 py-1 text-[10px] font-black uppercase rounded ${autoScale ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}
              >
                {autoScale ? 'ON' : 'OFF'}
              </button>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-xs uppercase font-black tracking-wider text-slate-400">Base Depth</div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map(d => (
                  <button
                    key={d}
                    onClick={() => {
                      setBaseDepth(d);
                      if (!autoScale) fetchPuzzle(); // fetch immediately if autoScale is off
                    }}
                    className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold rounded ${baseDepth === d ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-500">
              <TerminalIcon className="w-4 h-4" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Cognitive_Input_Stream</h3>
            </div>

            <div className={cn(
              "bg-slate-900/50 border p-8 min-h-[160px] flex flex-col justify-center relative transition-colors duration-200",
              errorStatus === 'RETRY' ? "border-red-500/50 bg-red-500/5" : "border-slate-800"
            )}>
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
              <div className="font-mono text-3xl font-bold text-slate-100 break-words leading-tight tracking-tight">
                {errorStatus === 'RETRY' ? (
                  <span className="text-red-500 animate-pulse uppercase">RETRY_REQUIRED</span>
                ) : puzzle ? (
                  <div className="flex flex-col gap-4">
                    <span className="opacity-90">
                      {sanMovesString}
                    </span>
                    <form onSubmit={handleTerminalSubmit} className="relative group">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-indigo-500 font-black scale-150 group-focus-within:animate-pulse">{'>'}</span>
                      <input 
                        ref={inputRef}
                        type="text"
                        autoFocus
                        value={terminalValue}
                        onChange={(e) => setTerminalValue(e.target.value)}
                        placeholder="Enter Move (e.g., Nc6)"
                        className="w-full bg-transparent border-none outline-none pl-8 text-2xl text-white placeholder:text-slate-800 font-bold tracking-tight"
                        disabled={status !== 'ACTIVE'}
                      />
                    </form>
                    <div className="flex justify-end pt-2">
                       <button 
                          onClick={revealSolution}
                          disabled={status !== 'ACTIVE'}
                          className="px-4 py-2 border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-20 rounded-sm text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                        >
                          <Zap className="w-3 h-3" />
                          [ View_Solution ]
                        </button>
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-800">WAITING_FOR_DATA...</span>
                )}
              </div>
              <div className="mt-6 flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-indigo-500" />
                <p className="text-[10px] text-slate-500 uppercase font-black">Visualize target move (Depth: {actualDepth}).</p>
              </div>
            </div>
          </div>

          {/* Feedback Block */}
          <div className={cn(
            "p-6 border transition-all flex items-center gap-4",
            errorStatus === 'RETRY' ? "bg-red-500/10 border-red-500/30" : "bg-slate-900 border-slate-800"
          )}>
            {errorStatus === 'RETRY' ? (
              <>
                <AlertCircle className="w-6 h-6 text-red-500" />
                <div>
                  <h4 className="text-xs font-black uppercase text-red-500">RETRY_REQUIRED</h4>
                  <p className="text-[10px] text-red-400/60 uppercase mt-1 tracking-tighter italic">Spatial mismatch detected.</p>
                </div>
              </>
            ) : (
              <>
                <Zap className="w-6 h-6 text-slate-700" />
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-700">CORE_ACTIVE</h4>
                  <p className="text-[10px] text-slate-500 uppercase mt-1 tracking-tighter">Awaiting tactile input.</p>
                </div>
              </>
            )}
          </div>

          <div className="pt-4 flex flex-col gap-2">
             <button 
                onClick={() => {
                  if (onAnalyze) {
                    onAnalyze('', revelationFen || mentalState?.fen || startingFen || undefined);
                  }
                }}
                disabled={status === 'LOADING' || !startingFen}
                className="w-full py-4 border border-indigo-900 hover:bg-indigo-900/30 text-indigo-400 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Analyze State</span>
              </button>
             <button 
                onClick={() => {
                        fetchPuzzle();
                      }}
                disabled={status === 'LOADING' || status === 'REVEALING'}
                className="w-full py-4 border border-slate-800 hover:bg-slate-800/50 text-slate-400 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <RefreshCcw className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Skip_Node</span>
              </button>
          </div>
        </div>
      </main>
    </div>
  );
}
