import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Crown, 
  Sparkles, 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  Flame, 
  Brain, 
  Database, 
  CheckCircle2, 
  XCircle, 
  Volume2, 
  VolumeX, 
  UploadCloud, 
  X, 
  Copy, 
  Check, 
  Eye, 
  ShieldAlert, 
  Compass, 
  FlameKindling,
  History
} from 'lucide-react';
import { Chessboard } from './Chessboard';
import { ChampionRadar } from './ChampionRadar';
import { 
  ChampionId, 
  CognitiveEngineState, 
  ChampionPersona, 
  ChampionGameRecord, 
  ChampionMomentRecord, 
  CachedRefutation 
} from '../types/champion';
import { championService } from '../services/championService';
import { soundEngine } from '../services/soundService';
import { ttsService } from '../services/ttsService';
import { analyzePgnWithMaiaPipeline } from '../services/maiaEngine';
import { cn } from '../lib/utils';

interface PlayLikeAChampionProps {
  onBack: () => void;
  onAnalyze?: (pgn?: string, fen?: string) => void;
}

export function PlayLikeAChampion({ onBack, onAnalyze }: PlayLikeAChampionProps) {
  // 1. Champion Personas & Master Selection
  const personas = useMemo(() => championService.getPersonas(), []);
  const [activePersonaId, setActivePersonaId] = useState<ChampionId>('kasparov');
  const activePersona = useMemo<ChampionPersona>(() => {
    return championService.getPersona(activePersonaId);
  }, [activePersonaId]);

  // Games for current champion
  const availableGames = useMemo<ChampionGameRecord[]>(() => {
    return championService.getGamesForPersona(activePersonaId);
  }, [activePersonaId]);

  const [activeGameId, setActiveGameId] = useState<string>('kasparov-topalov-1999');

  // Fallback to first game when champion changes
  useEffect(() => {
    if (availableGames.length > 0 && !availableGames.some(g => g.id === activeGameId)) {
      setActiveGameId(availableGames[0].id);
    }
  }, [availableGames, activeGameId]);

  const activeGame = useMemo<ChampionGameRecord>(() => {
    return availableGames.find(g => g.id === activeGameId) || availableGames[0] || championService.getGamesForPersona('kasparov')[0];
  }, [availableGames, activeGameId]);

  // Board Orientation automatically follows champion color
  const [orientation, setOrientation] = useState<'w' | 'b'>('w');
  useEffect(() => {
    if (activeGame?.championColor) {
      setOrientation(activeGame.championColor);
    }
  }, [activeGame]);

  // 2. Traversal State & Moves
  const [currentFen, setCurrentFen] = useState<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [allPlys, setAllPlys] = useState<{ san: string; fen: string; from: string; to: string }[]>([]);
  const [currentPlyIndex, setCurrentPlyIndex] = useState<number>(0);

  // 3. The 5-Phase Cognitive State Machine
  // [ AUTO_PLAY ] ──> [ HALTED_CRITICAL ] ──> [ EVALUATING_GUESS ]
  //                          │                       │
  //                          │ (On Incorrect)        │ (On Champion Move)
  //                          ▼                       ▼
  //                  [ PUNISHMENT_BRANCH ]   [ SUCCESS_REVELATION ]
  //                          │                       │
  //                          └─> (Rewind to Halted)  └─> (Resume Auto-Play)
  const [engineState, setEngineState] = useState<CognitiveEngineState>('AUTO_PLAY');

  // Active Critical Node
  const [activeMoment, setActiveMoment] = useState<ChampionMomentRecord | null>(null);
  const [activeRefutation, setActiveRefutation] = useState<CachedRefutation | null>(null);
  const [punishmentStep, setPunishmentStep] = useState<number>(0);
  const [isBoardLocked, setIsBoardLocked] = useState<boolean>(false);

  // Solved Moments tracker
  const [solvedMomentIds, setSolvedMomentIds] = useState<Set<string>>(new Set());

  // Audio / TTS settings
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);

  // Modals & Tools
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [rawPgnInput, setRawPgnInput] = useState<string>('');
  const [customGameTitle, setCustomGameTitle] = useState<string>('');
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Performance Stats
  const [stats, setStats] = useState(() => championService.getStats(activeGame?.id || 'kasparov-topalov-1999'));

  // Parse Master PGN into Plies
  useEffect(() => {
    if (!activeGame) return;
    try {
      const c = new Chess();
      c.loadPgn(activeGame.pgnContent);
      const history = c.history({ verbose: true });

      const tracker = new Chess();
      const plys = history.map((m) => {
        tracker.move({ from: m.from, to: m.to, promotion: m.promotion });
        return {
          san: m.san,
          fen: tracker.fen(),
          from: m.from,
          to: m.to
        };
      });

      setAllPlys(plys);
      setCurrentPlyIndex(0);
      setCurrentFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      setEngineState('AUTO_PLAY');
      setActiveMoment(null);
      setActiveRefutation(null);
      setIsBoardLocked(false);
      setSolvedMomentIds(new Set());
      setStats(championService.getStats(activeGame.id));
      ttsService.cancel();
    } catch (e) {
      console.error('Failed to parse champion PGN', e);
    }
  }, [activeGame]);

  // Sync TTS enabled state
  useEffect(() => {
    ttsService.setEnabled(ttsEnabled);
  }, [ttsEnabled]);

  // Count remaining critical decision nodes
  const totalNodes = activeGame?.moments?.length || 0;
  const remainingNodes = totalNodes - solvedMomentIds.size;

  // ---------------------------------------------------------------------------
  // STATE MACHINE RUNNER
  // ---------------------------------------------------------------------------

  // 1. AUTO_PLAY Engine Loop
  useEffect(() => {
    if (engineState !== 'AUTO_PLAY') return;

    // Check if the upcoming ply is a critical node halt!
    // A critical node halts BEFORE the champion's move (at plyNumber - 1).
    const matchingNode = activeGame?.moments?.find(
      m => (m.plyNumber - 1) === currentPlyIndex && !solvedMomentIds.has(m.id)
    );

    if (matchingNode) {
      // Transition: AUTO_PLAY -> HALTED_CRITICAL
      setEngineState('HALTED_CRITICAL');
      setActiveMoment(matchingNode);
      setActiveRefutation(null);
      setIsBoardLocked(false);
      soundEngine.play('premove');

      // Trigger Pre-Move Framing Narrative & TTS
      ttsService.speak(matchingNode.preMoveFraming, {
        pitch: activePersona.voiceProfile.pitch,
        rate: activePersona.voiceProfile.rate
      });
      return;
    }

    // Auto-advance through non-critical moves rapidly (320ms per ply)
    const timer = setTimeout(() => {
      if (currentPlyIndex < allPlys.length) {
        const nextPly = currentPlyIndex + 1;
        setCurrentPlyIndex(nextPly);
        setCurrentFen(allPlys[currentPlyIndex].fen);
        soundEngine.play('move');
      } else {
        // Traversal finished
        setEngineState('HALTED_CRITICAL');
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [engineState, currentPlyIndex, allPlys, activeGame, solvedMomentIds, activePersona]);

  // 2. Handle User Guess on Board or Choice Button
  const handleEvaluateGuess = useCallback((moveSanOrUci: string, from?: string, to?: string) => {
    if (engineState !== 'HALTED_CRITICAL' || !activeMoment || isBoardLocked) return;

    setEngineState('EVALUATING_GUESS');
    ttsService.cancel();

    // Persona Alignment Check: Strictly validate against master canonical move
    const isChampionMove = 
      moveSanOrUci === activeMoment.championMoveSan ||
      (from && to && `${from}${to}` === activeMoment.championMoveUci);

    if (isChampionMove) {
      // -----------------------------------------------------------------------
      // SUCCESS STATE TRANSITION: [ SUCCESS_REVELATION ]
      // -----------------------------------------------------------------------
      soundEngine.play('success');
      setEngineState('SUCCESS_REVELATION');
      setSolvedMomentIds(prev => new Set(prev).add(activeMoment.id));

      // Advance FEN to champion move executed on board
      const championPly = activeMoment.plyNumber;
      setCurrentPlyIndex(championPly);
      if (allPlys[championPly - 1]) {
        setCurrentFen(allPlys[championPly - 1].fen);
      }

      // Record positive alignment
      const newStats = championService.recordGuess(activeGame.id, true, false);
      setStats(newStats);

      // Trigger Structural Revelation commentary and TTS
      ttsService.speak(activeMoment.structuralRevelation, {
        pitch: activePersona.voiceProfile.pitch,
        rate: activePersona.voiceProfile.rate,
        onEnd: () => {
          // Auto-resume traversal after speech completes
        }
      });
    } else {
      // -----------------------------------------------------------------------
      // INCORRECT GUESS: [ PUNISHMENT_BRANCH ]
      // -----------------------------------------------------------------------
      soundEngine.play('fault');
      setEngineState('PUNISHMENT_BRANCH');
      setIsBoardLocked(true);

      // Check if user move matches one of the cached mistakes
      const matchedRefutation = activeMoment.cachedRefutations.find(
        r => r.blunderSan === moveSanOrUci
      ) || activeMoment.cachedRefutations[0] || {
        blunderSan: moveSanOrUci,
        blunderTitle: `Intuitive Departure: ${moveSanOrUci}`,
        punishmentSequence: ['dxe5', 'Qxd8+', 'Kxd8'],
        refutationNarration: `Playing ${moveSanOrUci} completely surrenders the initiative. The opponent immediately seizes active piece counterplay, leaving White overextended.`
      };

      setActiveRefutation(matchedRefutation);

      // Record punishment penalty
      const newStats = championService.recordGuess(activeGame.id, false, true);
      setStats(newStats);

      // Play Refutation TTS
      ttsService.speak(matchedRefutation.refutationNarration, {
        pitch: activePersona.voiceProfile.pitch,
        rate: activePersona.voiceProfile.rate
      });

      // Animate Opponent's Crushing Punishment Sequence (2-4 plies) on the board!
      let currentSeqFen = activeMoment.fenBefore;
      try {
        const sim = new Chess(activeMoment.fenBefore);
        // Play user's blunder first
        sim.move(moveSanOrUci);
        currentSeqFen = sim.fen();
        setCurrentFen(currentSeqFen);
      } catch (e) {
        // If illegal SAN passed directly, ignore
      }

      // Sequentially play punishment moves
      const sequence = matchedRefutation.punishmentSequence;
      let step = 0;
      setPunishmentStep(0);

      const interval = setInterval(() => {
        if (step < sequence.length) {
          try {
            const sim = new Chess(currentSeqFen);
            sim.move(sequence[step]);
            currentSeqFen = sim.fen();
            setCurrentFen(currentSeqFen);
            soundEngine.play('move');
            step += 1;
            setPunishmentStep(step);
          } catch {
            step += 1;
          }
        } else {
          clearInterval(interval);
          // Wait 1.8s for player to absorb refutation, then REWIND back to critical node!
          setTimeout(() => {
            setCurrentFen(activeMoment.fenBefore);
            soundEngine.play('premove');
            setIsBoardLocked(false);
            setEngineState('HALTED_CRITICAL');
          }, 1800);
        }
      }, 700);
    }
  }, [engineState, activeMoment, isBoardLocked, allPlys, activeGame, activePersona]);

  // Board Move Interceptor
  const handleBoardMove = (from: string, to: string) => {
    if (engineState !== 'HALTED_CRITICAL' || isBoardLocked || !activeMoment) {
      return;
    }

    try {
      const temp = new Chess(currentFen);
      const res = temp.move({ from, to, promotion: 'q' });
      if (!res) {
        soundEngine.play('fault');
        return;
      }
      handleEvaluateGuess(res.san, from, to);
    } catch {
      soundEngine.play('fault');
    }
  };

  // Resume Auto-Play after Success
  const handleResumeTraversal = () => {
    ttsService.cancel();
    setActiveMoment(null);
    setActiveRefutation(null);
    setEngineState('AUTO_PLAY');
  };

  // Skip / Rewind Traversal controls
  const handleRestartGame = () => {
    ttsService.cancel();
    setCurrentPlyIndex(0);
    setCurrentFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    setEngineState('AUTO_PLAY');
    setActiveMoment(null);
    setActiveRefutation(null);
    setIsBoardLocked(false);
    setSolvedMomentIds(new Set());
  };

  // Manual Raw PGN Ingestion via Maia-aligned Headless Pipeline
  const handleIngestRawPgn = () => {
    if (!rawPgnInput.trim()) return;

    try {
      const result = analyzePgnWithMaiaPipeline(rawPgnInput, activePersonaId, `custom-${Date.now()}`);
      
      const test = new Chess();
      test.loadPgn(rawPgnInput);
      const header = test.header();

      const newGame: ChampionGameRecord = {
        id: `custom-${Date.now()}`,
        championId: activePersonaId,
        championName: activePersona.name,
        stylisticDogma: activePersona.stylisticDogma,
        openingIntent: `Weaponized by ${activePersona.name} to enforce ${activePersona.stylisticDogma} through dynamic piece coordination and high tactical tension.`,
        totalCriticalMoments: result.totalNodes,
        pgnContent: rawPgnInput.trim(),
        championColor: header['White']?.toLowerCase().includes(activePersonaId) ? 'w' : 'b',
        moments: result.moments
      };

      championService.addCustomGame(newGame);
      setActiveGameId(newGame.id);
      setShowImportModal(false);
      setRawPgnInput('');
      setCustomGameTitle('');
      soundEngine.play('success');
    } catch (e) {
      alert('Failed to parse PGN. Please check the notation format.');
    }
  };

  // Supabase Relational Migration DDL
  const supabaseSqlSchema = `-- ============================================================================
-- SUPABASE RELATIONAL ARCHITECTURE: CAN YOU PLAY LIKE A CHAMPION (COGNITIVE SHADOWING)
-- Clean Master-Detail Schema without monolithic JSON blobs
-- ============================================================================

-- 1. Master Table: champion_games
CREATE TABLE IF NOT EXISTS champion_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  champion_name TEXT NOT NULL,
  stylistic_dogma TEXT NOT NULL,
  opening_intent TEXT NOT NULL,
  total_critical_moments INT NOT NULL DEFAULT 0,
  champion_color CHAR(1) NOT NULL DEFAULT 'w',
  pgn_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Granular Detail Table: champion_moments
CREATE TABLE IF NOT EXISTS champion_moments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES champion_games(id) ON DELETE CASCADE,
  ply_number INT NOT NULL,
  move_number INT NOT NULL,
  fen_before TEXT NOT NULL,
  champion_move_san TEXT NOT NULL,
  champion_move_uci TEXT,
  pre_move_framing TEXT NOT NULL,
  structural_revelation TEXT NOT NULL,
  cached_refutations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. High-Performance Indexing
CREATE INDEX IF NOT EXISTS idx_champion_moments_game_ply ON champion_moments(game_id, ply_number);
CREATE INDEX IF NOT EXISTS idx_champion_games_name ON champion_games(champion_name);`;

  return (
    <div className="h-full w-full bg-slate-950 text-titanium flex flex-col relative overflow-hidden select-none font-sans">
      
      {/* ======================================================================= */}
      {/* 1. TOP HEADER & "FOG OF WAR" PERSONA ANCHOR                             */}
      {/* Information Suppression: No ECO, no opening names, no eval bar         */}
      {/* ======================================================================= */}
      <header className="shrink-0 border-b border-white/10 bg-black/60 backdrop-blur-md px-3 sm:px-6 py-2.5 z-40 flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Exit to Arena & Champion Persona Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-white/50 hover:text-tritium-gold transition-colors flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">EXIT</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-tritium-gold/20 border border-tritium-gold/40 flex items-center justify-center text-tritium-gold">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  {activePersona.name}
                </h1>
                <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  {activePersona.epithet}
                </span>
              </div>
              <div className="text-[9px] font-mono text-tritium-gold uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3 h-3" />
                <span>DOGMA: {activePersona.stylisticDogma}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Champion Switcher Pills */}
        <div className="flex items-center gap-1 bg-black/70 p-1 rounded-xl border border-white/10 overflow-x-auto scrollbar-hide">
          {personas.map((p) => {
            const isSelected = p.id === activePersonaId;
            return (
              <button
                key={p.id}
                onClick={() => {
                  ttsService.cancel();
                  setActivePersonaId(p.id);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap",
                  isSelected
                    ? "bg-tritium-gold text-void font-black shadow-[0_0_12px_rgba(212,175,55,0.4)]"
                    : "text-white/40 hover:text-white"
                )}
              >
                {p.id === 'kasparov' && <Flame className="w-3 h-3" />}
                {p.id === 'tal' && <Sparkles className="w-3 h-3" />}
                {p.id === 'karpov' && <ShieldAlert className="w-3 h-3" />}
                {p.id === 'fischer' && <FlameKindling className="w-3 h-3" />}
                <span>{p.name.split(' ')[1] || p.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right: TTS Narration Toggle, Relational DB & Raw PGN Pipeline */}
        <div className="flex items-center gap-2">
          {/* TTS Toggle */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={cn(
              "px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer",
              ttsEnabled 
                ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.25)]" 
                : "bg-white/5 border-white/10 text-white/40"
            )}
            title={ttsEnabled ? "Device TTS Voice: Active" : "Device TTS Voice: Muted"}
          >
            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{ttsEnabled ? 'VOICE ON' : 'MUTED'}</span>
          </button>

          {/* Import Raw PGN (Maia Pipeline) */}
          <button
            onClick={() => setShowImportModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
            title="Ingest raw PGN with Maia-2 Human Blunder Detection"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="hidden md:inline">INGEST PGN</span>
          </button>

          {/* Supabase Relational Schema Modal */}
          <button
            onClick={() => setShowSqlModal(true)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white cursor-pointer"
            title="View Supabase Master-Detail Relational Architecture"
          >
            <Database className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ======================================================================= */}
      {/* 2. SUB-HEADER: FOG OF WAR STATUS & CRITICAL DECISION COUNTER            */}
      {/* ======================================================================= */}
      <div className="shrink-0 bg-black/40 border-b border-white/5 px-4 sm:px-6 py-2 flex items-center justify-between text-xs font-mono">
        {/* Active Phase State Badge */}
        <div className="flex items-center gap-2">
          <span className="text-white/40 uppercase text-[9px] tracking-widest">State:</span>
          <span className={cn(
            "text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-1",
            engineState === 'AUTO_PLAY' && "bg-cyan-950 text-cyan-300 border border-cyan-500/50 animate-pulse",
            engineState === 'HALTED_CRITICAL' && "bg-amber-950 text-amber-300 border border-amber-500/70 shadow-[0_0_10px_rgba(245,158,11,0.4)]",
            engineState === 'EVALUATING_GUESS' && "bg-purple-950 text-purple-300 border border-purple-500/50",
            engineState === 'PUNISHMENT_BRANCH' && "bg-rose-950 text-rose-300 border border-rose-500/70 animate-shake",
            engineState === 'SUCCESS_REVELATION' && "bg-emerald-950 text-emerald-300 border border-emerald-500/70"
          )}>
            {engineState === 'AUTO_PLAY' && <Play className="w-2.5 h-2.5 fill-current" />}
            {engineState === 'HALTED_CRITICAL' && <Zap className="w-2.5 h-2.5 fill-current" />}
            {engineState === 'PUNISHMENT_BRANCH' && <ShieldAlert className="w-2.5 h-2.5" />}
            {engineState === 'SUCCESS_REVELATION' && <CheckCircle2 className="w-2.5 h-2.5" />}
            <span>{engineState.replace('_', ' ')}</span>
          </span>

          {/* Critical Nodes Remaining Counter */}
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-white/60 ml-3">
            <span>Critical Nodes Remaining:</span>
            <span className="text-tritium-gold font-black bg-tritium-gold/10 px-1.5 py-0.5 rounded border border-tritium-gold/30">
              {remainingNodes} / {totalNodes}
            </span>
          </div>
        </div>

        {/* Cognitive Alignment Score */}
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-tritium-gold" />
          <span className="text-[10px] uppercase text-white/50">Intuition Alignment:</span>
          <span className="text-xs font-black text-tritium-gold">
            {stats.alignmentScore}%
          </span>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 3. MAIN WORKSPACE: FOG OF WAR CHESSBOARD & OVER-THE-BOARD NARRATIVES   */}
      {/* ======================================================================= */}
      <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 pb-24 sm:pb-6 flex flex-col lg:grid lg:grid-cols-12 gap-5 max-w-6xl mx-auto w-full">
        
        {/* LEFT COLUMN: CHESSBOARD + OVERLAY DOCKED NARRATIVES (lg:col-span-7) */}
        <section className="lg:col-span-7 flex flex-col items-center justify-start gap-3 w-full">
          
          {/* CHESSBOARD WRAPPER */}
          <div className="w-full max-w-[min(100%,54vh)] md:max-w-[480px] lg:max-w-[500px] aspect-square relative rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 bg-black">
            <Chessboard
              position={currentFen}
              onMove={handleBoardMove}
              turn={currentFen.split(' ')[1] as 'w' | 'b'}
              orientation={orientation}
              highlightSquares={activeMoment?.highlightSquares || []}
            />

            {/* HALTED CRITICAL PULSE RING */}
            {engineState === 'HALTED_CRITICAL' && (
              <div className="absolute inset-0 pointer-events-none border-4 border-tritium-gold shadow-[inset_0_0_40px_rgba(212,175,55,0.4)] animate-pulse rounded-2xl z-20" />
            )}

            {/* PUNISHMENT BRANCH SHIELD VIGNETTE */}
            {engineState === 'PUNISHMENT_BRANCH' && (
              <div className="absolute inset-0 pointer-events-none border-4 border-rose-500 bg-rose-950/20 shadow-[inset_0_0_50px_rgba(244,63,94,0.5)] z-20" />
            )}

            {/* =============================================================== */}
            {/* OVER-THE-BOARD NARRATIVE CARD 1: PRE-MOVE FRAMING (HALTED)     */}
            {/* =============================================================== */}
            <AnimatePresence>
              {engineState === 'HALTED_CRITICAL' && activeMoment && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="absolute inset-x-2 bottom-2 z-30 p-4 rounded-xl bg-slate-950/95 backdrop-blur-xl border-2 border-tritium-gold shadow-2xl space-y-3 text-left"
                >
                  <div className="flex items-center justify-between border-b border-tritium-gold/30 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-tritium-gold animate-bounce" />
                      <span className="text-[11px] font-mono font-black uppercase tracking-wider text-tritium-gold">
                        CRITICAL INFLECTION NODE (MOVE {activeMoment.moveNumber})
                      </span>
                    </div>
                    <span className="text-[8.5px] font-mono text-white/50 uppercase">
                      {activeMoment.turn === 'w' ? 'White' : 'Black'} to Move
                    </span>
                  </div>

                  {/* Pre-Move Framing Narrative */}
                  <p className="text-xs font-semibold text-white/95 leading-relaxed font-sans">
                    {activeMoment.preMoveFraming}
                  </p>

                  {/* Action Directive */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[9px] font-mono uppercase tracking-widest text-tritium-gold/80 flex items-center justify-between">
                      <span>Drag move on board or test intuitive temptations:</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {/* Master Choice */}
                      <button
                        onClick={() => handleEvaluateGuess(activeMoment.championMoveSan)}
                        className="col-span-2 text-left p-2.5 rounded-lg bg-black/70 border border-tritium-gold/60 hover:border-tritium-gold hover:bg-tritium-gold/20 transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-void bg-tritium-gold px-2 py-0.5 rounded">
                            {activeMoment.championMoveSan}
                          </span>
                          <span className="text-[11px] font-bold text-white group-hover:text-tritium-gold">
                            Execute Master Dogma
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-tritium-gold opacity-70 group-hover:opacity-100 uppercase">
                          [ CHAMPION ]
                        </span>
                      </button>

                      {/* Cached Human Mistakes */}
                      {activeMoment.cachedRefutations.map((ref, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleEvaluateGuess(ref.blunderSan)}
                          className="text-left p-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between"
                        >
                          <span className="text-xs font-mono font-bold text-white/70 bg-white/10 px-2 py-0.5 rounded">
                            {ref.blunderSan}
                          </span>
                          <span className="text-[9px] font-mono text-white/40 truncate max-w-[120px]">
                            {ref.blunderTitle.split(':')[1] || ref.blunderTitle}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* =============================================================== */}
            {/* OVER-THE-BOARD NARRATIVE CARD 2: PUNISHMENT BRANCH (INCORRECT)  */}
            {/* =============================================================== */}
            <AnimatePresence>
              {engineState === 'PUNISHMENT_BRANCH' && activeRefutation && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-x-2 bottom-2 z-30 p-4 rounded-xl bg-rose-950/95 backdrop-blur-xl border-2 border-rose-500 shadow-2xl space-y-2 text-left"
                >
                  <div className="flex items-center justify-between border-b border-rose-500/40 pb-2">
                    <div className="flex items-center gap-1.5 text-rose-300 font-mono text-[11px] font-black uppercase">
                      <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
                      <span>CRUSHING REFUTATION EN ROUTE</span>
                    </div>
                    <span className="text-[8.5px] font-mono text-rose-300/60 uppercase">
                      Step {punishmentStep} / {activeRefutation.punishmentSequence.length}
                    </span>
                  </div>

                  <p className="text-xs text-rose-100 font-medium leading-relaxed font-sans">
                    {activeRefutation.refutationNarration}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[9px] font-mono text-rose-300/80">
                    <span className="flex items-center gap-1">
                      <History className="w-3 h-3 animate-spin" />
                      Animating opponent's punishment moves...
                    </span>
                    <span className="italic">Rewinding to critical node</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* =============================================================== */}
            {/* OVER-THE-BOARD NARRATIVE CARD 3: SUCCESS REVELATION             */}
            {/* =============================================================== */}
            <AnimatePresence>
              {engineState === 'SUCCESS_REVELATION' && activeMoment && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-x-2 bottom-2 z-30 p-4 rounded-xl bg-slate-950/95 backdrop-blur-xl border-2 border-emerald-500 shadow-2xl space-y-3 text-left"
                >
                  <div className="flex items-center justify-between border-b border-emerald-500/40 pb-2">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs font-black uppercase">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{activeMoment.championMoveSan} - MASTERSTROKE SOLVED</span>
                    </div>
                    <span className="text-[8.5px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 font-bold">
                      +15% Intuition
                    </span>
                  </div>

                  <p className="text-xs text-white/95 leading-relaxed font-sans border-l-2 border-emerald-500 pl-2.5">
                    {activeMoment.structuralRevelation}
                  </p>

                  <div className="flex items-center justify-end pt-1">
                    <button
                      onClick={handleResumeTraversal}
                      className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-void font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.5)] flex items-center gap-1.5"
                    >
                      <span>RESUME AUTO-PLAY</span>
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* TRAVERSAL PROGRESS BAR & CONTROLS */}
          <div className="w-full max-w-[min(100%,54vh)] md:max-w-[480px] lg:max-w-[500px] flex items-center justify-between gap-2 bg-black/60 p-2 rounded-xl border border-white/10">
            <button
              onClick={handleRestartGame}
              className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white cursor-pointer"
              title="Restart Game Traversal"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Traversal Progress Indicator */}
            <div className="flex-1 px-2">
              <div className="flex items-center justify-between text-[9px] font-mono text-white/40 mb-1">
                <span>Move {Math.ceil(currentPlyIndex / 2)}</span>
                <span>Ply {currentPlyIndex} / {allPlys.length}</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-tritium-gold transition-all duration-300"
                  style={{ width: `${(currentPlyIndex / Math.max(1, allPlys.length)) * 100}%` }}
                />
              </div>
            </div>

            {/* Traversal State Toggle */}
            <button
              onClick={() => {
                if (engineState === 'AUTO_PLAY') {
                  setEngineState('HALTED_CRITICAL');
                } else if (engineState === 'HALTED_CRITICAL') {
                  setEngineState('AUTO_PLAY');
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-mono font-bold uppercase cursor-pointer"
            >
              {engineState === 'AUTO_PLAY' ? 'PAUSE' : 'AUTO-PLAY'}
            </button>
          </div>
        </section>

        {/* RIGHT COLUMN: CHAMPION RADAR & PHILOSOPHY (lg:col-span-5) */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Strategic Rationale & Opening Intent */}
          <div className="bg-black/60 border border-white/10 p-4 rounded-2xl shadow-lg space-y-2">
            <div className="flex items-center gap-2 text-tritium-gold">
              <Brain className="w-4 h-4" />
              <h3 className="text-xs font-mono font-black uppercase tracking-wider">
                CHAMPION STRATEGIC INTENT
              </h3>
            </div>
            <p className="text-xs text-white/80 leading-relaxed font-sans">
              {activeGame.openingIntent}
            </p>
          </div>

          {/* Dynamic Style DNA Radar Fingerprint */}
          <div className="bg-black/60 border border-white/10 p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center">
            <div className="w-full flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <span className="text-xs font-black uppercase text-tritium-gold font-mono">
                COGNITIVE RADAR FINGERPRINT
              </span>
              <span className="text-[9px] font-mono text-cyan-400">
                Persona Model
              </span>
            </div>

            <ChampionRadar
              championDna={activePersona.dna}
              championName={activePersona.name}
              size={260}
              showComparison={false}
            />

            {/* Stylistic Quote */}
            <div className="pt-3 border-t border-white/10 text-center w-full">
              <p className="text-[11px] text-white/70 italic font-serif leading-relaxed">
                "{activePersona.quote}"
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ======================================================================= */}
      {/* MODAL 1: SUPABASE RELATIONAL ARCHITECTURE CONTRACT                      */}
      {/* ======================================================================= */}
      <AnimatePresence>
        {showSqlModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border-2 border-tritium-gold/50 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-tritium-gold" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Supabase Master-Detail Relational Architecture
                  </h3>
                </div>
                <button 
                  onClick={() => setShowSqlModal(false)}
                  className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs font-mono text-white/70 leading-relaxed">
                As mandated by the Backend Engineering Directive, games, personas, and critical decision nodes are decoupled into clean relational master-detail tables without unindexed JSON blobs:
              </p>

              <div className="relative">
                <pre className="bg-black/90 p-3.5 rounded-xl border border-white/15 text-[10px] text-amber-200 overflow-x-auto max-h-[200px] leading-relaxed">
                  {supabaseSqlSchema}
                </pre>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(supabaseSqlSchema);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2000);
                  }}
                  className="absolute top-2 right-2 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-[9px] flex items-center gap-1 cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSql ? 'COPIED' : 'COPY DDL'}</span>
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 rounded-lg bg-tritium-gold text-void font-mono text-xs font-black uppercase cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================================= */}
      {/* MODAL 2: INGEST RAW PGN (MAIA-ALIGNED ANALYSIS PIPELINE)               */}
      {/* ======================================================================= */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border-2 border-tritium-gold/50 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-tritium-gold" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Maia-Aligned Ingestion & Synthetic Blunder Pipeline
                  </h3>
                </div>
                <button 
                  onClick={() => setShowImportModal(false)}
                  className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs font-mono text-white/70 leading-relaxed">
                Paste any raw PGN. The offline analyzer flags irreversible structural shifts, extracts tempting human blunders, and computes 2–4 ply cached punishment sequences automatically.
              </p>

              <textarea
                value={rawPgnInput}
                onChange={(e) => setRawPgnInput(e.target.value)}
                rows={6}
                placeholder="1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6..."
                className="w-full bg-black/80 border border-white/15 rounded-xl p-3 text-xs font-mono text-amber-200 placeholder-white/20 focus:border-tritium-gold outline-none"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs font-mono uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleIngestRawPgn}
                  disabled={!rawPgnInput.trim()}
                  className="px-5 py-2 rounded-lg bg-tritium-gold hover:bg-white text-void font-mono text-xs font-black uppercase disabled:opacity-30 cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                >
                  Ingest & Train
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
