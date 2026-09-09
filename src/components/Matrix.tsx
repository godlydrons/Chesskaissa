import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Chessboard } from './Chessboard';
import { cn } from '../lib/utils';
import { 
  Play,
  Pause,
  ArrowLeft,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Sparkles,
  Clock,
  Brain,
  FastForward,
  Check,
  X,
  Trophy,
  Award,
  ChevronRight,
  Zap,
  HelpCircle,
  SkipForward,
  ChevronLeft
} from 'lucide-react';
import { Chess } from 'chess.js';
import { useTrainingEngine } from '../hooks/useTrainingEngine';
import { detectRepertoireSideToPlay } from '../lib/colorDetection';
import { matrixProgress, type QuizChallenge, type MatrixMasteryData } from '../services/matrixProgressService';
import { VaultDB } from '../lib/db';
import { soundEngine } from '../services/soundService';

interface MatrixProps {
  pgn?: string | null;
  openingId?: string;
  orientation?: 'w' | 'b';
  onBack: () => void;
  onBlunder: () => void;
}

/**
 * CAISSA-CORE: NEURAL MATRIX (TRAINING ENGINE)
 * Features:
 * 1. Sequential N+1 Training & 0→N Echo Recall methodologies
 * 2. Mastery Scoring (N+1 = "Mastery", 0→N = "Elite Mastery")
 * 3. Saved progress of lines mastered persisted across sessions
 * 4. Top-left Close (X) button for immediate exit
 * 5. Proceed to Next Line / Next PGN in file navigation
 * 6. Active Interleaved Mastered Node Quiz between lines
 */
export function Matrix({ pgn: initialPgn, openingId = 'global', orientation, onBack, onBlunder }: MatrixProps) {
  // Current active PGN text (can transition to next PGN in the file/vault)
  const [currentPgn, setCurrentPgn] = useState<string | null>(initialPgn || null);

  useEffect(() => {
    if (initialPgn) {
      setCurrentPgn(initialPgn);
    }
  }, [initialPgn]);

  // Determine effective training perspective (explicit prop -> 4-step color waterfall)
  const initialSide = useMemo<'w' | 'b'>(() => {
    if (orientation) return orientation;
    if (!currentPgn) return 'w';
    return detectRepertoireSideToPlay(currentPgn).side;
  }, [currentPgn, orientation]);

  const [activeSide, setActiveSide] = useState<'w' | 'b'>(initialSide);
  const [showSettings, setShowSettings] = useState(false);

  // Mastery progress state (persisted across sessions via matrixProgress)
  const [masteryData, setMasteryData] = useState<MatrixMasteryData>(() => matrixProgress.getData());

  // Next PGN in the file / master card detected from VaultDB
  const [vaultNextPgn, setVaultNextPgn] = useState<{ pgn: string; title: string } | null>(null);

  // Active Interleaved Mastered Node Quiz state
  const [activeQuiz, setActiveQuiz] = useState<QuizChallenge | null>(null);
  const [quizGame, setQuizGame] = useState<Chess | null>(null);
  const [quizStatus, setQuizStatus] = useState<'UNANSWERED' | 'CORRECT' | 'WRONG'>('UNANSWERED');
  const [quizFeedback, setQuizFeedback] = useState<string>('');
  const [selectedQuizOption, setSelectedQuizOption] = useState<string | null>(null);
  const [pendingNextLine, setPendingNextLine] = useState(false);

  // Sync orientation if prop changes
  useEffect(() => {
    if (orientation) {
      setActiveSide(orientation);
    } else if (currentPgn) {
      setActiveSide(detectRepertoireSideToPlay(currentPgn).side);
    }
  }, [orientation, currentPgn]);

  // Repertoire extraction: clean sequential PGN lines
  const repertoireLines = useMemo(() => {
    if (!currentPgn) return [];
    const rawChunks = currentPgn.includes('[Event') || currentPgn.includes('[White')
      ? currentPgn.split(/(?=(?:^|\n)\s*\[(?:Event|White|Opening)\b)/i)
      : currentPgn.split(/\n\s*\n/).filter(s => s.trim().length > 0);

    return rawChunks.map(p => {
      try {
        const chess = new Chess();
        chess.loadPgn(p);
        const hist = chess.history();
        if (hist.length > 0) return hist;
      } catch (e) {
        // continue to fallback
      }
      // Fallback move parser for custom sequence tokens
      const rawMoves = p
        .replace(/\[.*?\]/g, '')
        .replace(/\d+\.?\s*\.\.\.\s*/g, '')
        .replace(/\d+\.\s*/g, '')
        .replace(/\{.*?\}/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/1-0|0-1|1\/2-1\/2|\*/g, '')
        .trim()
        .split(/\s+/)
        .filter(m => m.length > 0 && !m.startsWith('$'));
      return rawMoves;
    }).filter(line => line.length > 0);
  }, [currentPgn]);

  const {
    game,
    currentStep,
    targetDepth,
    totalSteps,
    lineIndex,
    setLineIndex,
    totalLines,
    status,
    setStatus,
    logs,
    shake,
    opponentLastMove,
    premoves,
    clearPremoves,
    startTraining,
    handleUserMove,
    resetBoardToRoot,
    faultsCount,
    lastMasteryResult,
    goToNextLine,
    goToPreviousLine,
    jumpToLine,
    restartCurrentLine,
    // 0 to N Echo Recall additions
    trainingMethod,
    setTrainingMethod,
    playbackSpeedMs,
    setPlaybackSpeedMs,
    inspectionPauseSec,
    setInspectionPauseSec,
    echoPhase,
    inspectionRemaining,
    isInspectionPaused,
    toggleInspectionPause,
    checkoutInspection,
    restartEchoDemo,
  } = useTrainingEngine(
    repertoireLines,
    activeSide,
    openingId,
    (targetFen, line) => {
      // Refresh mastery data from store whenever graduation happens
      setMasteryData(matrixProgress.getData());
    }
  );

  // Sync mastery data when status becomes GRADUATED or COMPLETE
  useEffect(() => {
    if (status === 'GRADUATED' || status === 'COMPLETE') {
      setMasteryData(matrixProgress.getData());
    }
  }, [status]);

  // Check VaultDB to see if the current PGN belongs to a Master Card with subsequent games/PGNs
  useEffect(() => {
    if (!currentPgn) return;
    VaultDB.getAllMasterCards().then(cards => {
      if (!cards || cards.length === 0) return;
      const cleanCurrent = currentPgn.trim();
      for (const card of cards) {
        if (!card.games || card.games.length <= 1) continue;
        const gIdx = card.games.findIndex(g => g.pgn.trim() === cleanCurrent);
        if (gIdx !== -1 && gIdx < card.games.length - 1) {
          const nextGame = card.games[gIdx + 1];
          setVaultNextPgn({
            pgn: nextGame.pgn,
            title: nextGame.white || nextGame.event || `Variation ${gIdx + 2}`
          });
          return;
        }
      }
      setVaultNextPgn(null);
    }).catch(() => {});
  }, [currentPgn]);

  // Auto-start drill loop immediately on mount if repertoire is present and not in quiz
  useEffect(() => {
    if (currentPgn && repertoireLines.length > 0 && !activeQuiz) {
      startTraining();
    }
  }, [currentPgn, repertoireLines, startTraining]);

  const isActive = status === 'AWAITING_USER' || status === 'ENGINE_THINKING' || status === 'TRACING' || status === 'GRADUATED';
  const isComplete = status === 'COMPLETE';
  const isLineGraduated = status === 'GRADUATED';

  // Propagate blunder fault effect to global App state
  useEffect(() => {
    if (status === 'FAULT') {
      onBlunder();
    }
  }, [status, onBlunder]);

  // Function to launch the random mastered node quiz
  const triggerMasteredNodeQuiz = useCallback((onCompleteCallback?: () => void) => {
    const challenge = matrixProgress.getRandomQuizChallenge();
    if (challenge) {
      try {
        const qGame = new Chess(challenge.node.fen);
        setQuizGame(qGame);
        setActiveQuiz(challenge);
        setQuizStatus('UNANSWERED');
        setQuizFeedback('');
        setSelectedQuizOption(null);
        soundEngine.play('move');
        return true;
      } catch (e) {
        console.warn('Failed to load quiz position:', e);
      }
    }
    return false;
  }, []);

  // Handle Proceed to Next Line or Next PGN in the file
  const handleProceedToNext = useCallback(() => {
    // If there is another line in the current repertoire file:
    if (lineIndex < totalLines - 1) {
      // Randomly ask correct moves of mastered nodes between showing moves & training
      const launchedQuiz = triggerMasteredNodeQuiz();
      if (launchedQuiz) {
        setPendingNextLine(true);
      } else {
        // No mastered nodes recorded yet, proceed directly to next line
        goToNextLine();
        setTimeout(() => {
          startTraining();
        }, 80);
      }
    } else if (vaultNextPgn) {
      // Proceed to next PGN in the file/master card!
      const launchedQuiz = triggerMasteredNodeQuiz();
      if (launchedQuiz) {
        setPendingNextLine(true);
      } else {
        setCurrentPgn(vaultNextPgn.pgn);
        setVaultNextPgn(null);
        setLineIndex(0);
      }
    }
  }, [lineIndex, totalLines, vaultNextPgn, triggerMasteredNodeQuiz, goToNextLine, startTraining, setLineIndex]);

  // Handle Proceeding to the next PGN in file directly
  const handleProceedToNextPgnInFile = useCallback(() => {
    if (!vaultNextPgn) return;
    const launchedQuiz = triggerMasteredNodeQuiz();
    if (launchedQuiz) {
      setPendingNextLine(true);
    } else {
      setCurrentPgn(vaultNextPgn.pgn);
      setVaultNextPgn(null);
      setLineIndex(0);
      soundEngine.play('success');
    }
  }, [vaultNextPgn, triggerMasteredNodeQuiz, setLineIndex]);

  // Dismiss Quiz and begin the pending line training
  const dismissQuizAndResume = useCallback(() => {
    setActiveQuiz(null);
    setQuizGame(null);
    setQuizStatus('UNANSWERED');
    setQuizFeedback('');
    setSelectedQuizOption(null);

    if (pendingNextLine) {
      setPendingNextLine(false);
      if (lineIndex < totalLines - 1) {
        goToNextLine();
        setTimeout(() => {
          startTraining();
        }, 120);
      } else if (vaultNextPgn) {
        setCurrentPgn(vaultNextPgn.pgn);
        setVaultNextPgn(null);
        setLineIndex(0);
      }
    }
  }, [pendingNextLine, lineIndex, totalLines, goToNextLine, startTraining, vaultNextPgn, setLineIndex]);

  // Handle answer in the Mastered Node Quiz
  const handleQuizAnswer = useCallback((chosenSan: string) => {
    if (!activeQuiz || !quizGame || quizStatus !== 'UNANSWERED') return;
    setSelectedQuizOption(chosenSan);

    if (chosenSan === activeQuiz.correctSan) {
      try {
        const nextG = new Chess(quizGame.fen());
        nextG.move(chosenSan);
        setQuizGame(nextG);
      } catch {}

      soundEngine.play('success');
      setQuizStatus('CORRECT');
      setQuizFeedback(`PERFECT RECALL! "${chosenSan}" is the exact mastered move. (+25 Mastery XP)`);

      // Auto-advance to line training after 1.5s
      setTimeout(() => {
        dismissQuizAndResume();
      }, 1600);
    } else {
      soundEngine.play('fault');
      setQuizStatus('WRONG');
      setQuizFeedback(`NOT QUITE. In this mastered node, the correct move was "${activeQuiz.correctSan}".`);
    }
  }, [activeQuiz, quizGame, quizStatus, dismissQuizAndResume]);

  // Handle board drag move in Quiz
  const handleQuizBoardMove = useCallback((from: string, to: string) => {
    if (!activeQuiz || !quizGame || quizStatus !== 'UNANSWERED') return;
    try {
      const copy = new Chess(quizGame.fen());
      const res = copy.move({ from, to, promotion: 'q' });
      if (res) {
        handleQuizAnswer(res.san);
      } else {
        soundEngine.play('fault');
      }
    } catch {
      soundEngine.play('fault');
    }
  }, [activeQuiz, quizGame, quizStatus, handleQuizAnswer]);

  // Determine if current turn is an "N" review turn or the frontier "N+1" turn
  const isFrontierTurn = trainingMethod === 'N_PLUS_ONE' && currentStep >= targetDepth;

  // Compute ghost square hint
  const ghostSquare = useMemo(() => {
    if (!isActive || activeQuiz) return null;
    if (trainingMethod === 'ECHO_RECALL') return null; // Pure memory retrieval in Echo Recall
    if (!isFrontierTurn) return null; // N moves: glow is disabled
    
    // N+1 frontier turn: illuminated
    const currentLine = repertoireLines[lineIndex] || [];
    const expectedMove = currentStep < currentLine.length ? currentLine[currentStep] : null;
    if (!expectedMove) return null;

    try {
      const tempGame = new Chess(game.fen());
      const m = tempGame.move(expectedMove);
      return m ? m.to : null;
    } catch {
      return null;
    }
  }, [isActive, activeQuiz, trainingMethod, isFrontierTurn, repertoireLines, lineIndex, currentStep, game]);

  const currentMoveNumber = Math.floor(currentStep / 2) + 1;
  const targetMoveNumber = Math.floor(targetDepth / 2) + 1;
  const currentLineMoves = repertoireLines[lineIndex] || [];

  return (
    <div className={cn(
      "min-h-[100dvh] w-full flex flex-col bg-[#030712] text-white transition-colors duration-500 overflow-y-auto overflow-x-hidden select-none",
      shake && "bg-red-950/25"
    )}>
      
      {/* 1. TOP DOCKED HEADER BAR */}
      <header className="w-full shrink-0 border-b border-white/5 bg-slate-950/90 backdrop-blur-md px-2.5 sm:px-4 py-2 sm:py-2.5 z-40 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Cross Close Button (USER DIRECTIVE: cross at top left to close section) & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={onBack}
            className="p-1.5 sm:p-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300 border border-red-500/30 transition-all flex items-center justify-center cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.2)]"
            title="Close Matrix (Exit to Vault)"
          >
            <X className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff] animate-pulse" />
              <h1 className="text-xs sm:text-sm font-black italic tracking-wider uppercase text-white/90">
                NEURAL_MATRIX
              </h1>
            </div>
            <p className="text-[8px] sm:text-[9px] font-mono text-cyan-400/60 uppercase tracking-widest">
              {trainingMethod === 'ECHO_RECALL' ? 'Echo Recall (0→N)' : 'Sequential N+1'} // Line {lineIndex + 1}/{Math.max(1, totalLines)}
            </p>
          </div>
        </div>

        {/* Center: Persistent Mastery Progress Badges (USER DIRECTIVE: n+1 is mastery, 0 to N is elite mastery) */}
        <div className="hidden md:flex items-center gap-2 font-mono text-[10px]">
          {/* N+1 Mastery Counter */}
          <div 
            className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
            title="Lines mastered using sequential N+1 frontier methodology"
          >
            <Award className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-white/60">Mastery:</span>
            <span className="font-bold text-white">{masteryData.masteredLinesCount}</span>
            <span className="text-[8px] text-cyan-400/80 uppercase font-black tracking-wider">(N+1)</span>
          </div>

          {/* 0 to N Elite Mastery Counter */}
          <div 
            className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-300 flex items-center gap-1.5 shadow-[0_0_10px_rgba(168,85,247,0.15)]"
            title="Lines mastered using 0→N Echo Recall memory methodology"
          >
            <Trophy className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-white/60">Elite Mastery:</span>
            <span className="font-bold text-white">{masteryData.eliteMasteredLinesCount}</span>
            <span className="text-[8px] text-purple-400/80 uppercase font-black tracking-wider">(0→N)</span>
          </div>
        </div>

        {/* Center-Right: Method Mode Selector Switcher */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-black/60 p-0.5 sm:p-1 rounded-lg border border-white/10">
          <button
            onClick={() => {
              setTrainingMethod('N_PLUS_ONE');
              startTraining();
            }}
            className={cn(
              "px-2 sm:px-2.5 py-1 rounded text-[9px] sm:text-[10px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer",
              trainingMethod === 'N_PLUS_ONE'
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                : "text-white/40 hover:text-white/80"
            )}
            title="Sequential N+1 Drill: Step-by-step frontier verification"
          >
            <Sparkles className="w-3 h-3" />
            <span>N+1</span>
          </button>

          <button
            onClick={() => {
              setTrainingMethod('ECHO_RECALL');
              startTraining();
            }}
            className={cn(
              "px-2 sm:px-2.5 py-1 rounded text-[9px] sm:text-[10px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer",
              trainingMethod === 'ECHO_RECALL'
                ? "bg-purple-500/20 text-purple-300 border border-purple-400/60 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                : "text-white/40 hover:text-white/80"
            )}
            title="0→N Echo Recall: High-speed demonstration then full retrieval from memory"
          >
            <Brain className="w-3 h-3" />
            <span>0→N</span>
          </button>
        </div>

        {/* Right: Quick Actions & Settings Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Active Recall Check button */}
          {masteryData.masteredNodes.length > 0 && (
            <button
              onClick={() => triggerMasteredNodeQuiz()}
              className="hidden sm:flex text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-amber-300 hover:text-amber-200 transition-all items-center gap-1 bg-amber-500/15 hover:bg-amber-500/25 px-2 py-1 rounded border border-amber-500/30 cursor-pointer shadow-[0_0_8px_rgba(245,158,11,0.2)]"
              title="Test a random question from your mastered nodes"
            >
              <Zap className="w-3 h-3 text-amber-400 fill-current" />
              <span>Recall Quiz</span>
            </button>
          )}

          {/* Board Orientation Toggle */}
          <button
            onClick={() => setActiveSide(s => s === 'w' ? 'b' : 'w')}
            className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-cyan-400 hover:text-cyan-300 transition-all flex items-center gap-1 bg-black/60 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded border border-cyan-500/30 hover:border-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.15)] cursor-pointer"
            title="Toggle Board Perspective (White / Black)"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{activeSide === 'w' ? '⚪ W' : '⚫ B'}</span>
          </button>

          <button
            onClick={() => setShowSettings(prev => !prev)}
            className={cn(
              "p-1 sm:p-1.5 rounded border transition-colors cursor-pointer",
              showSettings 
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_8px_rgba(6,182,212,0.3)]" 
                : "bg-white/5 text-white/60 hover:text-white border-white/10 hover:bg-white/10"
            )}
            title="Training Mode Settings & Progress"
          >
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </header>

      {/* SETTINGS & MASTERY DRAWER */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full bg-slate-950/95 border-b border-cyan-500/20 backdrop-blur-xl px-4 py-3 z-30 overflow-hidden"
          >
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Top Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20">
                  <span className="text-[10px] text-cyan-400/70 uppercase block">Mastery (N+1)</span>
                  <span className="text-lg font-black text-white">{masteryData.masteredLinesCount} lines</span>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/20">
                  <span className="text-[10px] text-purple-400/70 uppercase block">Elite Mastery (0→N)</span>
                  <span className="text-lg font-black text-white">{masteryData.eliteMasteredLinesCount} lines</span>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/20">
                  <span className="text-[10px] text-amber-400/70 uppercase block">Mastered Nodes</span>
                  <span className="text-lg font-black text-white">{masteryData.masteredNodes.length} nodes</span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400/70 uppercase block">Mastery Score XP</span>
                  <span className="text-lg font-black text-white">{masteryData.totalMasteryPoints} pts</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                {/* Setting 1: Training Mode */}
                <div className="space-y-1.5">
                  <span className="text-white/50 uppercase text-[10px] tracking-wider block">Training Strategy</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setTrainingMethod('N_PLUS_ONE');
                        startTraining();
                      }}
                      className={cn(
                        "flex-1 py-1.5 px-2 rounded border text-center text-[10px] font-bold uppercase transition-all cursor-pointer",
                        trainingMethod === 'N_PLUS_ONE'
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                          : "bg-slate-900 border-white/10 text-white/60 hover:bg-slate-800"
                      )}
                    >
                      Sequential N+1
                    </button>
                    <button
                      onClick={() => {
                        setTrainingMethod('ECHO_RECALL');
                        startTraining();
                      }}
                      className={cn(
                        "flex-1 py-1.5 px-2 rounded border text-center text-[10px] font-bold uppercase transition-all cursor-pointer",
                        trainingMethod === 'ECHO_RECALL'
                          ? "bg-purple-500/20 text-purple-300 border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                          : "bg-slate-900 border-white/10 text-white/60 hover:bg-slate-800"
                      )}
                    >
                      Echo Recall (0→N)
                    </button>
                  </div>
                </div>

                {/* Setting 2: Playback Speed */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/50 uppercase tracking-wider">0→N Playback Speed</span>
                    <span className="text-purple-300 font-bold">{playbackSpeedMs}ms / move</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[250, 400, 500, 750, 1000].map(speed => (
                      <button
                        key={speed}
                        onClick={() => setPlaybackSpeedMs(speed)}
                        className={cn(
                          "flex-1 py-1 rounded text-center text-[9px] font-bold uppercase transition-all border cursor-pointer",
                          playbackSpeedMs === speed
                            ? "bg-purple-500 text-slate-950 border-purple-400"
                            : "bg-slate-900 border-white/10 text-white/50 hover:text-white"
                        )}
                      >
                        {speed}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Setting 3: Inspection Pause */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/50 uppercase tracking-wider">Inspection Pause</span>
                    <span className="text-purple-300 font-bold">{inspectionPauseSec}s</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[0, 3, 5, 10, 15].map(sec => (
                      <button
                        key={sec}
                        onClick={() => setInspectionPauseSec(sec)}
                        className={cn(
                          "flex-1 py-1 rounded text-center text-[9px] font-bold uppercase transition-all border cursor-pointer",
                          inspectionPauseSec === sec
                            ? "bg-purple-500 text-slate-950 border-purple-400"
                            : "bg-slate-900 border-white/10 text-white/50 hover:text-white"
                        )}
                      >
                        {sec === 0 ? 'Manual' : `${sec}s`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-2 sm:px-4 py-3 sm:py-4 flex flex-col items-center justify-start gap-4">
        
        {/* INTERLEAVED MASTERED NODE QUIZ OVERLAY / BANNER */}
        <AnimatePresence>
          {activeQuiz && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              className="w-full max-w-xl bg-slate-950/95 border-2 border-amber-400/60 rounded-2xl p-4 sm:p-5 shadow-[0_0_30px_rgba(245,158,11,0.35)] backdrop-blur-xl relative z-30"
            >
              <div className="flex items-center justify-between gap-3 mb-3 border-b border-amber-400/20 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-amber-400/20 text-amber-300">
                    <Zap className="w-4 h-4 fill-current" />
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300">
                      Mastered Node Recall Quiz
                    </h3>
                    <p className="text-[10px] font-mono text-white/50">
                      Random active challenge from your mastered repertoire
                    </p>
                  </div>
                </div>

                <button
                  onClick={dismissQuizAndResume}
                  className="px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider text-white/40 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Skip quiz and proceed to line"
                >
                  <SkipForward className="w-3 h-3" />
                  <span>Skip</span>
                </button>
              </div>

              {/* Question Text */}
              <div className="p-3 bg-amber-950/30 border border-amber-400/20 rounded-xl mb-4">
                <p className="text-sm font-bold text-white/95 leading-snug">
                  "{activeQuiz.questionText}"
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-amber-300/70">
                  <span>Playing as: <strong className="text-white uppercase">{activeQuiz.node.playerColor === 'w' ? 'White' : 'Black'}</strong></span>
                  <span>•</span>
                  <span>Move: <strong className="text-white">#{activeQuiz.node.moveNumber}</strong></span>
                  {activeQuiz.node.opponentLastMove && (
                    <>
                      <span>•</span>
                      <span>Opponent: <strong className="text-amber-200">{activeQuiz.node.opponentLastMove}</strong></span>
                    </>
                  )}
                </div>
              </div>

              {/* Move Choice Pills */}
              <div className="grid grid-cols-2 gap-2.5 mb-3">
                {activeQuiz.options.map((san, idx) => {
                  const isSelected = selectedQuizOption === san;
                  const isCorrect = san === activeQuiz.correctSan;
                  let btnClass = "bg-slate-900/90 border-white/15 text-white/80 hover:border-amber-400/60 hover:bg-amber-400/10 hover:text-white";

                  if (quizStatus === 'CORRECT') {
                    if (isCorrect) {
                      btnClass = "bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]";
                    }
                  } else if (quizStatus === 'WRONG') {
                    if (isSelected) {
                      btnClass = "bg-rose-500/25 border-rose-400 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.4)]";
                    } else if (isCorrect) {
                      btnClass = "bg-emerald-500/20 border-emerald-400/60 text-emerald-300";
                    }
                  }

                  return (
                    <button
                      key={san}
                      onClick={() => handleQuizAnswer(san)}
                      disabled={quizStatus !== 'UNANSWERED'}
                      className={cn(
                        "py-3 px-3 rounded-xl border font-mono font-black text-sm uppercase tracking-wider transition-all flex items-center justify-between cursor-pointer",
                        btnClass
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] text-white/40 font-normal">[{idx + 1}]</span>
                        <span>{san}</span>
                      </span>
                      {quizStatus === 'CORRECT' && isCorrect && (
                        <Check className="w-4 h-4 text-emerald-400" />
                      )}
                      {quizStatus === 'WRONG' && isSelected && (
                        <X className="w-4 h-4 text-rose-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback Alert and Continue Button */}
              {quizStatus !== 'UNANSWERED' && (
                <div className="mt-3 flex flex-col gap-2.5">
                  <div className={cn(
                    "p-3 rounded-xl text-xs font-mono leading-relaxed",
                    quizStatus === 'CORRECT'
                      ? "bg-emerald-950/40 border border-emerald-400/40 text-emerald-300"
                      : "bg-rose-950/40 border border-rose-400/40 text-rose-300"
                  )}>
                    {quizFeedback}
                  </div>

                  <button
                    onClick={dismissQuizAndResume}
                    className="w-full py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.4)] cursor-pointer"
                  >
                    <span>CONTINUE TO NEW LINE TRAINING</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Context Header above the Board */}
        <div className="w-full max-w-xl flex items-center justify-between px-1">
          {/* Left: Line and Ply Counters */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold">
              Line {lineIndex + 1} of {totalLines}
            </span>

            {/* Navigation buttons: Next / Previous Line in file */}
            <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousLine}
                disabled={lineIndex <= 0}
                className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 text-white/70 transition-colors cursor-pointer"
                title="Previous line in file"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={goToNextLine}
                disabled={lineIndex >= totalLines - 1}
                className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 text-white/70 transition-colors cursor-pointer"
                title="Next line in file"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: Method Indicator or Phase */}
          <div className="flex items-center gap-2 font-mono text-[10px]">
            {trainingMethod === 'ECHO_RECALL' ? (
              <span className={cn(
                "px-2 py-0.5 rounded uppercase font-bold",
                echoPhase === 'DEMO' ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 animate-pulse" :
                echoPhase === 'INSPECTION' ? "bg-amber-500/20 text-amber-300 border border-amber-400/40" :
                echoPhase === 'RECALL' ? "bg-purple-500/20 text-purple-300 border border-purple-400/40" :
                "text-white/40"
              )}>
                {echoPhase === 'DEMO' ? '0→N Demonstration' :
                 echoPhase === 'INSPECTION' ? `Inspection (${inspectionRemaining}s)` :
                 echoPhase === 'RECALL' ? 'Memory Recall' : 'Echo Ready'}
              </span>
            ) : (
              <span className="text-cyan-400/80">
                Move {currentMoveNumber} / {Math.ceil(totalSteps / 2)}
              </span>
            )}
          </div>
        </div>

        {/* 3. CHESSBOARD CONTAINER */}
        <div className="w-full max-w-xl aspect-square flex items-center justify-center relative">
          <div className="w-full h-full p-1 rounded-2xl bg-gradient-to-b from-white/10 to-transparent border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.8)] relative">
            <Chessboard 
              position={activeQuiz && quizGame ? quizGame.fen() : game.fen()}
              orientation={activeQuiz ? activeQuiz.node.playerColor : activeSide}
              turn={activeQuiz ? activeQuiz.node.playerColor : game.turn()}
              ghostSquare={ghostSquare}
              opponentLastMove={activeQuiz ? (activeQuiz.node.opponentFrom && activeQuiz.node.opponentTo ? { from: activeQuiz.node.opponentFrom, to: activeQuiz.node.opponentTo, san: activeQuiz.node.opponentLastMove || '' } : null) : opponentLastMove}
              premoves={activeQuiz ? [] : premoves}
              onCancelPremoves={clearPremoves}
              allowPremoves={!activeQuiz}
              onMove={(from, to) => {
                if (activeQuiz) {
                  handleQuizBoardMove(from, to);
                } else {
                  handleUserMove({ from, to });
                }
              }}
            />

            {/* Echo Recall Inspection Break Countdown Overlay */}
            <AnimatePresence>
              {trainingMethod === 'ECHO_RECALL' && echoPhase === 'INSPECTION' && !activeQuiz && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-20 bg-slate-950/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center gap-4 border border-purple-500/40 shadow-[0_0_40px_rgba(168,85,247,0.3)]"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest block">
                      [ 0→N Demonstration Finished ]
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black italic uppercase text-white">
                      Inspect Final Position
                    </h3>
                    <p className="text-xs font-mono text-white/60 max-w-xs mx-auto">
                      Memorize the structure and critical piece placements before blind recall.
                    </p>
                  </div>

                  {inspectionPauseSec > 0 ? (
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-full border-2 border-purple-400/40 flex items-center justify-center bg-purple-950/40 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                        <span className="text-2xl font-black font-mono text-purple-300">
                          {inspectionRemaining}
                        </span>
                      </div>
                      <button
                        onClick={toggleInspectionPause}
                        className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        title={isInspectionPaused ? "Resume Countdown" : "Pause Countdown"}
                      >
                        {isInspectionPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        <span>{isInspectionPaused ? 'Resume' : 'Pause'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-purple-300/80 bg-purple-950/30 px-3 py-1 rounded border border-purple-500/20">
                      Untimed Inspection Mode
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={checkoutInspection}
                      className="px-6 py-2.5 bg-purple-500 hover:bg-purple-400 text-slate-950 font-black uppercase tracking-wider text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] active:scale-[0.98] cursor-pointer flex items-center gap-2"
                    >
                      <Brain className="w-4 h-4" />
                      <span>START 0→N BLIND RECALL</span>
                    </button>

                    <button
                      onClick={restartEchoDemo}
                      className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 font-mono uppercase tracking-wider text-xs rounded-xl border border-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Replay Demo</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 4. BOTTOM STATUS BAR & DRILL CONTROLS */}
        <div className="w-full max-w-xl space-y-3">
          {/* Real-time feedback log */}
          <div className="w-full p-2.5 rounded-xl bg-slate-950/80 border border-white/5 font-mono text-xs text-white/70">
            {logs.length > 0 && (
              <div className="flex items-center gap-2">
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  logs[logs.length - 1].type === 'success' ? "bg-emerald-400 shadow-[0_0_4px_#34d399]" :
                  logs[logs.length - 1].type === 'error' ? "bg-rose-400 shadow-[0_0_4px_#f43f5e]" :
                  logs[logs.length - 1].type === 'awaiting' ? "bg-cyan-400 shadow-[0_0_4px_#00f0ff]" : "bg-white/30"
                )} />
                <span className={cn(
                  "truncate tracking-wide",
                  logs[logs.length - 1].type === 'success' ? "text-emerald-400 font-bold" :
                  logs[logs.length - 1].type === 'error' ? "text-rose-400 font-bold" :
                  logs[logs.length - 1].type === 'awaiting' ? "text-cyan-300" : "text-white/50"
                )}>
                  {logs[logs.length - 1].text}
                </span>
              </div>
            )}
          </div>

          {/* Bottom Action Controls: Skip / Next / Start */}
          <div className="flex items-center gap-2">
            {!isActive && !isComplete && !isLineGraduated && (
              <button 
                onClick={startTraining}
                className="flex-1 py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] active:scale-[0.98] cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                {trainingMethod === 'ECHO_RECALL' ? 'START ECHO RECALL (0→N)' : 'ENGAGE N+1 DRILL'}
              </button>
            )}

            {/* Quick Proceed to Next Line Button (available during training) */}
            {(lineIndex < totalLines - 1 || vaultNextPgn) && !isComplete && (
              <button
                onClick={handleProceedToNext}
                className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-mono uppercase tracking-wider text-xs rounded-xl border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer ml-auto shrink-0"
                title="Proceed ahead to next line in file"
              >
                <span>Next Line</span>
                <FastForward className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </main>

      {/* 5. LINE GRADUATION & COMPLETION MODAL */}
      <AnimatePresence>
        {(isLineGraduated || isComplete) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center gap-6 p-6 text-center"
          >
            {/* Top-Left Cross Close Button (USER DIRECTIVE: cross at top left to close section) */}
            <button
              onClick={onBack}
              className="absolute top-6 left-6 p-2.5 rounded-full bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-300 border border-white/10 hover:border-red-500/40 transition-all cursor-pointer shadow-lg"
              title="Close Matrix (Return to Vault)"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Glowing Trophy / Badge Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-400/20 blur-[90px] rounded-full scale-150" />
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 14 }}
              >
                {trainingMethod === 'ECHO_RECALL' ? (
                  <Trophy className="w-24 h-24 text-purple-400 relative z-10 drop-shadow-[0_0_25px_#c084fc]" />
                ) : (
                  <CheckCircle2 className="w-24 h-24 text-cyan-400 relative z-10 drop-shadow-[0_0_25px_#00f0ff]" />
                )}
              </motion.div>
            </div>
            
            {/* Title & Description */}
            <div className="space-y-2 max-w-md">
              <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter uppercase text-white">
                {isComplete ? 'Repertoire_Mastered' : 'Variation_Mastered'}
              </h2>
              <p className="text-xs font-mono text-cyan-300/80 uppercase tracking-[0.3em] leading-relaxed">
                {isComplete 
                  ? `All ${totalLines} lines in this file verified with precision!`
                  : `Line ${lineIndex + 1} of ${totalLines} completed in full.`}
              </p>
            </div>

            {/* MASTERY SCORE CARD & SAVED PROGRESS (USER DIRECTIVE: give mastery score and save progress) */}
            <div className="w-full max-w-sm bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 shadow-[0_0_20px_rgba(6,182,212,0.2)] font-mono">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                <span className="text-[11px] text-white/50 uppercase tracking-wider">Mastery Score</span>
                <span className="text-2xl font-black text-cyan-300">
                  {lastMasteryResult?.score || 98}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left text-xs mb-3">
                <div>
                  <span className="text-[10px] text-white/40 block uppercase">Certification</span>
                  <span className="font-bold text-white">
                    {trainingMethod === 'ECHO_RECALL' ? '💎 Elite Mastery' : '🏅 Sequential Mastery'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 block uppercase">Precision</span>
                  <span className="font-bold text-emerald-400">
                    {faultsCount === 0 ? '100% Flawless' : `${Math.max(60, 100 - faultsCount * 6)}% (${faultsCount} blunders)`}
                  </span>
                </div>
              </div>

              {/* Progress Counters */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/70">
                <div className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Mastered (N+1): <strong className="text-white">{masteryData.masteredLinesCount}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-purple-400" />
                  <span>Elite (0→N): <strong className="text-white">{masteryData.eliteMasteredLinesCount}</strong></span>
                </div>
              </div>
            </div>

            {/* NAVIGATION ACTIONS (USER DIRECTIVE: Proceed to next option which lets you move ahead and hands next pgn) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
              {/* Primary Next Action: Proceed to Next Line */}
              {lineIndex < totalLines - 1 ? (
                <button 
                  onClick={handleProceedToNext}
                  className="w-full sm:flex-1 py-3.5 px-6 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:shadow-[0_0_35px_rgba(0,240,255,0.6)] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>PROCEED TO NEXT LINE ({lineIndex + 2}/{totalLines})</span>
                  <FastForward className="w-4 h-4 fill-current" />
                </button>
              ) : vaultNextPgn ? (
                <button 
                  onClick={handleProceedToNextPgnInFile}
                  className="w-full sm:flex-1 py-3.5 px-6 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>PROCEED TO NEXT PGN IN FILE</span>
                  <FastForward className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setLineIndex(0);
                    startTraining();
                  }}
                  className="w-full sm:flex-1 py-3.5 px-6 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-[0_0_25px_rgba(0,240,255,0.4)] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>REPLAY FILE FROM LINE 1</span>
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              {/* Repeat Line Button */}
              <button 
                onClick={restartCurrentLine}
                className="w-full sm:w-auto py-3.5 px-4 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-mono uppercase tracking-wider text-xs rounded-xl border border-white/10 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                title="Practice this line again"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Repeat</span>
              </button>

              {/* Return to Vault Button */}
              <button 
                onClick={onBack}
                className="w-full sm:w-auto py-3.5 px-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-mono uppercase tracking-wider text-xs rounded-xl border border-white/10 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                title="Return to Repertoire Vault"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
