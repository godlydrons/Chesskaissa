import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Skull, 
  Layers, 
  Search,
  Lock,
  Map,
  Target,
  ChevronLeft,
  ChevronRight,
  Database,
  Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { CommandCenter } from './components/CommandCenter';
import { ArenaLobby } from './components/ArenaLobby';
import { Crucible } from './components/Crucible';
import { Matrix } from './components/Matrix';
import { PgnVault } from './components/PgnVault';
import { ReconLab } from './components/ReconLab';
import { BlindfoldGym } from './components/BlindfoldGym';
import { Forge } from './components/Forge';
import { AnalysisBoard } from './components/AnalysisBoard';
import { RepertoireCity } from './components/RepertoireCity';
import { PlayLikeAChampion } from './components/PlayLikeAChampion';
import { LichessAuth } from './services/lichessAuth';
import { THEME } from './theme';
import { MATRIX_DATA } from './data/matrixData';
import { parsePgnToMatrix } from './lib/pgnParser';
import { NeuralMatrix } from './types/MatrixDatabase';

export default function App() {
  const [mode, setModeState] = useState<'COMMAND' | 'VAULT' | 'ARENA' | 'CRUCIBLE' | 'MATRIX' | 'RECON' | 'MAP' | 'BLINDFOLD' | 'FORGE' | 'ANALYSIS' | 'CHAMPION'>('COMMAND');
  const [activeIndex, setActiveIndex] = useState(1); // 0: Recon, 1: Command, 2: Arena
  const [isBlunderFlash, setIsBlunderFlash] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Dynamic Repertoire State
  const [customMatrix, setCustomMatrix] = useState<NeuralMatrix | null>(null);
  const [activePgn, setActivePgn] = useState<string | null>(null);
  const [activeOrientation, setActiveOrientation] = useState<'w' | 'b'>('w');
  const [activeAnalysisPgn, setActiveAnalysisPgn] = useState<string | undefined>(undefined);
  const [activeAnalysisFen, setActiveAnalysisFen] = useState<string | undefined>(undefined);

  const handleAnalyze = (pgn?: string, fen?: string) => {
    setActiveAnalysisPgn(pgn);
    setActiveAnalysisFen(fen);
    setModeState('ANALYSIS');
  };
  const [activePuzzle, setActivePuzzle] = useState<any>(null);

  // Sync activeIndex with mode for spatial views
  useEffect(() => {
    const spatialModes = ['RECON', 'COMMAND', 'ARENA'] as const;
    const index = spatialModes.indexOf(mode as any);
    if (index !== -1) {
      setActiveIndex(index);
    }
  }, [mode]);

  const setMode = (newMode: 'COMMAND' | 'VAULT' | 'ARENA' | 'CRUCIBLE' | 'MATRIX' | 'RECON' | 'MAP' | 'ATLAS' | 'BLINDFOLD' | 'FORGE' | 'ANALYSIS' | 'CHAMPION') => {
    // Clear functional state if entering personal Arena/Recon modes
    if (newMode === 'ARENA' || newMode === 'RECON') {
      setActivePgn(null);
      setCustomMatrix(null);
    }
    if (newMode === 'ATLAS') {
      setModeState('MAP');
    } else {
      setModeState(newMode);
    }
  };

  useEffect(() => {
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      LichessAuth.exchangeCode(code)
        .then(() => LichessAuth.getProfile())
        .then(profile => {
          setUser(profile);
          window.history.replaceState({}, document.title, "/");
        });
    } else {
      const timeout = setTimeout(() => {
        setAuthLoading(false);
      }, 5000); // 5s emergency fallback

      LichessAuth.getProfile().then(profile => {
        clearTimeout(timeout);
        setUser(profile);
        setAuthLoading(false);
      }).catch(() => {
        clearTimeout(timeout);
        setAuthLoading(false);
      });
    }
  }, []);

  const handleLogin = () => LichessAuth.login();
  const handleLogout = () => {
    LichessAuth.logout();
    setUser(null);
  };

  const handleStudyGame = (pgn: string) => {
    setActivePgn(pgn);
    setActivePuzzle(null);
    setMode('MATRIX'); // Boot Theory Training Protocol
  };

  const handleTrainPuzzle = (puzzle: any) => {
    setActivePuzzle(puzzle);
    setActivePgn(null);
    setMode('CRUCIBLE');
  };

  const triggerBlunderEffect = () => {
    setIsBlunderFlash(true);
    setTimeout(() => setIsBlunderFlash(false), 500);
  };

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] bg-oled-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-tritium-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-tritium-gold font-black uppercase tracking-widest text-[10px]">Initializing_Neural_Chain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "h-[100dvh] w-full bg-void text-titanium selection:bg-tritium-gold selection:text-void transition-all duration-300 overflow-hidden relative",
      isBlunderFlash && "ring-inset ring-[20px] ring-molten-copper/50"
    )}>
      {/* Z-Index -10: The Omnipresent Map */}
      <div className="matrix-background opacity-20 blur-[10px]">
        <Matrix key={activePgn || "matrix"} onBack={() => {}} onBlunder={() => {}} />
      </div>

      {/* Main Content Area: Spatial Viewport */}
      <main className={cn(
        "h-full w-full relative z-0",
        isBlunderFlash && "shredder-shake"
      )}>
        <AnimatePresence mode="wait">
          {(mode === 'COMMAND' || mode === 'ARENA' || mode === 'RECON') ? (
            <motion.div
              key="spatial-viewport"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, x: `-${activeIndex * 100}vw` }}
              exit={{ opacity: 0 }}
              drag="x"
              dragConstraints={{ left: -window.innerWidth * 2, right: 0 }}
              dragElastic={0.05}
              onDragEnd={(_, info) => {
                const swipeThreshold = 50;
                const velocityThreshold = 500;
                const spatialModes = ['RECON', 'COMMAND', 'ARENA'] as const;
                
                if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
                  if (activeIndex < 2) setMode(spatialModes[activeIndex + 1]);
                } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
                  if (activeIndex > 0) setMode(spatialModes[activeIndex - 1]);
                }
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex h-full w-[300vw] cursor-grab active:cursor-grabbing"
            >
              {/* Screen 0: Recon Lab */}
              <div className="w-full h-full overflow-y-auto">
                <ReconLab onBack={() => setMode('COMMAND')} onLoadCurriculum={() => setMode('CRUCIBLE')} />
              </div>

              {/* Screen 1: Command Center */}
              <div className="w-full h-full overflow-y-auto scrollbar-hide">
                <CommandCenter onNavigate={setMode} />
              </div>

              {/* Screen 2: Arena Lobby */}
              <div className="w-full h-full overflow-y-auto">
                <ArenaLobby onNavigate={setMode} onTrainPuzzle={handleTrainPuzzle} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={mode}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={THEME.physics.instant}
              className="h-full w-full"
            >
              {mode === 'VAULT' && (
                <PgnVault 
                  onBack={() => setMode('COMMAND')}
                  onStudyGame={(pgn, orientation) => {
                    setActivePgn(pgn);
                    if (orientation) {
                      setActiveOrientation(orientation);
                    }
                    setMode('MATRIX');
                  }}
                  onAnalyze={(pgn) => {
                    handleAnalyze(pgn);
                  }}
                />
              )}
              {mode === 'CRUCIBLE' && (
                <Crucible 
                  onBlunder={triggerBlunderEffect} 
                  onBack={() => setMode('COMMAND')} 
                  puzzle={activePuzzle}
                  onAnalyze={handleAnalyze}
                />
              )}
              {mode === 'MAP' && (
                <RepertoireCity 
                  onBack={() => setMode('COMMAND')} 
                  onTrainLine={(pgn, orientation) => {
                    setActivePgn(pgn);
                    if (orientation) {
                      setActiveOrientation(orientation);
                    }
                    setMode('MATRIX');
                  }}
                />
              )}
              {mode === 'MATRIX' && (
                <Matrix key={`${activePgn || "matrix"}-${activeOrientation}`} 
                  pgn={activePgn} 
                  orientation={activeOrientation}
                  onBack={() => setMode('VAULT')} 
                  onBlunder={triggerBlunderEffect}
                />
              )}
              {mode === 'BLINDFOLD' && (
                <BlindfoldGym 
                  onBack={() => setMode('ARENA')}
                  onAnalyze={handleAnalyze}
                />
              )}
              {mode === 'FORGE' && (
                <Forge 
                  onBack={() => setMode('ARENA')}
                  onAnalyze={handleAnalyze} 
                />
              )}
              {mode === 'ANALYSIS' && (
                <AnalysisBoard
                  onBack={() => setModeState('COMMAND')}
                  initialPgn={activeAnalysisPgn}
                  initialFen={activeAnalysisFen}
                />
              )}
              {mode === 'CHAMPION' && (
                <PlayLikeAChampion
                  onBack={() => setMode('COMMAND')}
                  onAnalyze={handleAnalyze}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Command Pill */}
      <AnimatePresence>
        {(mode === 'COMMAND' || mode === 'VAULT' || mode === 'ARENA' || mode === 'RECON' || mode === 'MATRIX' || mode === 'MAP' || mode === 'ANALYSIS' || mode === 'CHAMPION') && (
          <motion.nav
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="command-pill"
          >
            <NavIcon 
              active={mode === 'RECON'} 
              onClick={() => setMode('RECON')} 
              icon={<Search />} 
              label="Recon"
            />
            <NavIcon 
              active={mode === 'COMMAND'} 
              onClick={() => setMode('COMMAND')} 
              icon={<LayoutDashboard />} 
              label="Command"
            />
            <NavIcon 
              active={mode === 'CHAMPION'} 
              onClick={() => setMode('CHAMPION')} 
              icon={<Crown />} 
              label="Legends"
            />
            <NavIcon 
              active={mode === 'VAULT'} 
              onClick={() => setMode('VAULT')} 
              icon={<Database />} 
              label="Vault"
            />
            <NavIcon 
              active={mode === 'MAP'} 
              onClick={() => setMode('MAP')} 
              icon={<Map />} 
              label="Map"
            />
            <NavIcon 
              active={mode === 'ARENA'} 
              onClick={() => setMode('ARENA')} 
              icon={<Skull />} 
              label="Arena"
            />
            <NavIcon 
              active={mode === 'MATRIX'} 
              onClick={() => setMode('MATRIX')} 
              icon={<Layers />} 
              label="Matrix"
            />
            <NavIcon 
              active={mode === 'ANALYSIS'} 
              onClick={() => setMode('ANALYSIS')} 
              icon={<Target />} 
              label="Analyze"
            />
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Auth & Vault Portal (Top Right) */}
      {(mode === 'COMMAND' || mode === 'ARENA' || mode === 'RECON') && (
        <div className="fixed top-3 right-3 sm:top-6 sm:right-6 md:top-8 md:right-8 z-50 flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => setMode('VAULT')}
            className="flex items-center gap-1.5 sm:gap-2 glass-card px-2.5 py-1.5 sm:px-3.5 sm:py-2 hover:border-tritium-gold/50 transition-all cursor-pointer text-tritium-gold hover:text-white"
            title="Open PGN Repertoire Vault"
          >
            <Database className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-tritium-gold" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest hidden xs:inline">PGN_Vault</span>
            <span className="text-[9px] font-black uppercase tracking-widest xs:hidden">Vault</span>
          </button>

          {user ? (
            <button 
              onClick={handleLogout}
              className="flex items-center gap-1.5 sm:gap-2.5 glass-card px-2.5 py-1.5 sm:px-3.5 sm:py-2 border-tritium-gold/20"
            >
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-terminal-green shadow-[0_0_5px_#2ECC71] rounded-full" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-tritium-gold monospace max-w-[90px] sm:max-w-none truncate">@{user.username}</span>
            </button>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-1.5 sm:gap-2 glass-card px-2.5 py-1.5 sm:px-3.5 sm:py-2 hover:border-white/30 transition-all cursor-pointer text-muted-grey hover:text-white"
              title="Connect Lichess Account"
            >
              <Lock className="w-3 h-3" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Lichess</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function NavIcon({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 sm:gap-1 p-1 sm:p-1.5 rounded-lg transition-all duration-200 cursor-pointer shrink-0 min-w-[34px] xs:min-w-[40px] sm:min-w-[50px]",
        active ? "text-tritium-gold scale-105" : "text-muted-grey hover:text-zinc-300 active:scale-95"
      )}
    >
      <div className="w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">
        {icon}
      </div>
      <span className="text-[7px] xs:text-[7.5px] sm:text-[8px] md:text-[9px] font-black uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}
