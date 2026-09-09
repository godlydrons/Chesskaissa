import React, { useState, useEffect, useRef } from 'react';
import { Chess, Move } from 'chess.js';
import { Chessboard } from './Chessboard';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, SkipBack, SkipForward, Play, Pause, AlertTriangle, Edit3, Target } from 'lucide-react';
import { cn } from '../lib/utils';
import { StockfishEngine, EngineEval } from '../services/engineService';
import { soundEngine } from '../services/soundService';

interface AnalysisBoardProps {
  onBack: () => void;
  initialPgn?: string;
  initialFen?: string;
}

export function AnalysisBoard({ onBack, initialPgn, initialFen }: AnalysisBoardProps) {
  const [game, setGame] = useState(() => {
    const c = new Chess();
    if (initialPgn) {
      try { c.loadPgn(initialPgn); } catch(e) {}
    } else if (initialFen) {
      try { c.load(initialFen); } catch(e) {}
    }
    return c;
  });
  
  const [history, setHistory] = useState<Move[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [evaluation, setEvaluation] = useState<EngineEval | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const engineRef = useRef<StockfishEngine | null>(null);
  const [isEditorMode, setIsEditorMode] = useState(false);

  useEffect(() => {
    setHistory(game.history({ verbose: true }));
    setHistoryIndex(game.history().length - 1);
  }, [game]);

  useEffect(() => {
    engineRef.current = new StockfishEngine();
    setEngineReady(true);
    engineRef.current.setEvaluationListener((ev) => setEvaluation(ev));

    return () => {
      engineRef.current?.stop();
    };
  }, []);

  const currentFen = React.useMemo(() => {
    if (isEditorMode) return game.fen();
    if (historyIndex === -1) {
      return new Chess(initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1').fen();
    }
    const tempGame = new Chess(initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    for (let i = 0; i <= historyIndex; i++) {
      if (history[i]) {
        tempGame.move(history[i].san);
      }
    }
    return tempGame.fen();
  }, [history, historyIndex, initialFen, isEditorMode, game]);

  useEffect(() => {
    if (engineReady && !isEditorMode) {
      engineRef.current?.evaluate(currentFen);
    }
  }, [currentFen, engineReady, isEditorMode]);

  const handleMove = (source: string, target: string, piece: string) => {
    if (isEditorMode) return false;
    
    try {
      const tempGame = new Chess(currentFen);
      const move = tempGame.move({ from: source, to: target, promotion: piece[1]?.toLowerCase() ?? 'q' });
      if (move) {
        soundEngine.play(move.captured ? 'capture' : 'move');
        
        // If we are branching from the middle of history, we should truncate history
        const newGame = new Chess(initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        for (let i = 0; i <= historyIndex; i++) {
          newGame.move(history[i].san);
        }
        newGame.move(move);
        setGame(newGame);
        
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  };

  const handleDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    if (isEditorMode) { try { const g = new Chess(game.fen()); g.move({ from: sourceSquare, to: targetSquare, promotion: "q" }); setGame(g); return true; } catch(e) { return false; } } // Handled by standard drag and drop in chessboard for editor mode? react-chessboard might not support piece drop without controlled state.
    return handleMove(sourceSquare, targetSquare, piece);
  };

  const evalPercent = evaluation ? 50 + Math.max(-50, Math.min(50, evaluation.score / 10)) : 50;

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-200 flex flex-col font-mono overflow-y-auto overflow-x-hidden">
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-slate-900 z-50">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/5 border border-white/5 rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-500" />
            <h1 className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-300">
              {isEditorMode ? 'Board_Editor' : 'Analysis_Core'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <button
             onClick={() => setIsEditorMode(!isEditorMode)}
             className={cn(
               "px-4 py-2 border rounded text-[10px] uppercase font-bold tracking-widest transition-all",
               isEditorMode ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" : "bg-slate-800 text-slate-400 border-white/10 hover:bg-slate-700"
             )}
           >
             <Edit3 className="w-3 h-3 inline mr-2" />
             Editor Mode
           </button>
        </div>
      </header>

      <div className="flex-1 flex lg:flex-row flex-col p-4 gap-4 overflow-y-auto">
        <div className="flex-1 flex justify-center items-center relative max-h-[80vh]">
          {/* Eval Bar */}
          {!isEditorMode && (
             <div className="absolute left-4 top-12 bottom-12 w-3 bg-slate-800 rounded-full overflow-y-auto overflow-x-hidden border border-white/10 flex flex-col justify-end">
               <div 
                 className="w-full bg-slate-200 transition-all duration-300 relative"
                 style={{ height: `${evalPercent}%` }}
               />
               <div className="absolute top-1/2 left-0 w-full h-[1px] bg-red-500/50" />
             </div>
          )}

          <div className="w-full max-w-[min(100%,45vh)] md:max-w-[500px] aspect-square shrink-0 relative shadow-2xl">
            <Chessboard 
              position={currentFen}
              onMove={(from, to) => handleDrop(from, to, "wq")}
              turn={new Chess(currentFen).turn() === "w" ? "w" : "b"}
            />
          </div>
        </div>
        
        <div className="w-full lg:w-80 flex flex-col gap-4">
           <div className="bg-slate-900 border border-white/10 p-4 rounded-lg flex flex-col min-h-[200px]">
             <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">Evaluation</div>
             {evaluation ? (
               <div className="flex items-end gap-2">
                 <span className="text-3xl font-black">{evaluation.type === 'mate' ? `M${Math.abs(evaluation.score)}` : (evaluation.score / 100).toFixed(2)}</span>
                 <span className="text-xs text-slate-400 mb-1">Depth {evaluation.depth}</span>
               </div>
             ) : (
               <div className="text-slate-500 text-sm animate-pulse">Initializing Stockfish...</div>
             )}
           </div>

           {!isEditorMode && (
             <div className="bg-slate-900 border border-white/10 p-4 rounded-lg flex-1 flex flex-col">
               <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">Move_History</div>
               <div className="flex-1 overflow-y-auto font-mono text-sm pr-2 scrollbar-thin">
                 {history.length === 0 ? (
                   <span className="text-slate-600 italic">No moves played.</span>
                 ) : (
                   <div className="flex flex-wrap gap-x-4 gap-y-1">
                     {history.reduce((acc: any[], move, i) => {
                       if (i % 2 === 0) {
                         acc.push(
                           <div key={i} className="flex gap-2">
                             <span className="text-slate-600 w-6">{Math.floor(i/2) + 1}.</span>
                             <button 
                               className={cn("hover:text-white transition-colors", historyIndex === i ? "text-emerald-400 font-bold" : "text-slate-300")}
                               onClick={() => setHistoryIndex(i)}
                             >
                               {move.san}
                             </button>
                             {history[i+1] && (
                               <button 
                                 className={cn("hover:text-white transition-colors", historyIndex === i+1 ? "text-emerald-400 font-bold" : "text-slate-300")}
                                 onClick={() => setHistoryIndex(i+1)}
                               >
                                 {history[i+1].san}
                               </button>
                             )}
                           </div>
                         );
                       }
                       return acc;
                     }, [])}
                   </div>
                 )}
               </div>
               
               <div className="flex justify-center gap-2 mt-4 pt-4 border-t border-white/5">
                 <button onClick={() => setHistoryIndex(-1)} className="p-2 hover:bg-white/10 rounded"><SkipBack className="w-4 h-4" /></button>
                 <button onClick={() => setHistoryIndex(Math.max(-1, historyIndex - 1))} className="p-2 hover:bg-white/10 rounded"><ChevronLeft className="w-4 h-4" /></button>
                 <button onClick={() => setHistoryIndex(Math.min(history.length - 1, historyIndex + 1))} className="p-2 hover:bg-white/10 rounded"><ChevronRight className="w-4 h-4" /></button>
                 <button onClick={() => setHistoryIndex(history.length - 1)} className="p-2 hover:bg-white/10 rounded"><SkipForward className="w-4 h-4" /></button>
               </div>
             </div>
           )}

           {isEditorMode && (
             <div className="bg-slate-900 border border-white/10 p-4 rounded-lg flex-1 flex flex-col">
               <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">Editor_Controls</div>
               <div className="text-sm text-slate-400 mb-4">
                 Use FEN to set position manually.
               </div>
               <textarea 
                 className="w-full bg-black/50 border border-white/10 rounded p-2 text-xs font-mono text-slate-300 h-24 mb-4"
                 value={game.fen()}
                 onChange={(e) => {
                   try {
                     const newGame = new Chess(e.target.value);
                     setGame(newGame);
                   } catch(err) {}
                 }}
               />
               <div className="flex gap-2">
                 <button 
                   onClick={() => setGame(new Chess())}
                   className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold"
                 >
                   Start Pos
                 </button>
                 <button 
                   onClick={() => {
                     const emptyGame = new Chess();
                     emptyGame.clear();
                     setGame(emptyGame);
                   }}
                   className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold"
                 >
                   Clear Board
                 </button>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
