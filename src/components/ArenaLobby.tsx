import React from 'react';
import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { THEME } from '../theme';
import { cn } from '../lib/utils';
import { puzzleService } from '../services/puzzleService';

interface ArenaLobbyProps {
  onNavigate: (mode: 'COMMAND' | 'ARENA' | 'CRUCIBLE' | 'MATRIX' | 'RECON' | 'BLINDFOLD' | 'FORGE' | 'CHAMPION') => void;
  onTrainPuzzle: (puzzle: any) => void;
}

/**
 * CAISSA-CORE: ARENA LOBBY
 * The Execution Gateway.
 * Strictly locked screen with zero vertical scrolling.
 * Bento Box layout (75/25 split).
 */
export function ArenaLobby({ onNavigate, onTrainPuzzle }: ArenaLobbyProps) {
  const handleInitiatePuzzle = async () => {
    const puzzle = await puzzleService.getDailyPuzzle();
    if (puzzle) onTrainPuzzle(puzzle);
  };

  return (
    <div className="h-full w-full flex flex-col p-3 sm:p-6 gap-4 sm:gap-6 overflow-y-auto sm:overflow-hidden bg-void pb-28 sm:pb-6">
      
      {/* ZONE 1: THE ALPHA PORTAL (Top 75%) */}
      <div className="flex-[3] min-h-[300px] sm:min-h-0">
        <GlassCard className="h-full relative group">
          {/* Background Hook: Blurred Chessboard */}
          <div 
            className="absolute inset-0 opacity-20 scale-105 group-hover:scale-100 transition-transform duration-[2000ms]"
            style={{
              backgroundImage: 'url(https://picsum.photos/seed/chess-board/1200/800?blur=10)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: '#020617' // Slate-950 fallback
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-void/80 via-void/20 to-void/80" />

          {/* Header (Top Left) */}
          <div className="absolute top-4 left-4 sm:top-8 sm:left-8 z-10 flex flex-col gap-1 sm:gap-2">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-titanium">
              [ THE FORGE // SPATIAL REPETITION ]
            </h2>
          </div>

          {/* The Catalyst (Dead Center) */}
          <div className="h-full flex items-center justify-center relative z-10 p-4">
            <motion.button
              onClick={() => onNavigate('FORGE')}
              animate={{ 
                boxShadow: [
                  "0 0 20px rgba(59,130,246,0.1)", // Neon Blue Pulse
                  "0 0 40px rgba(59,130,246,0.3)",
                  "0 0 20px rgba(59,130,246,0.1)"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="bg-blue-600 px-6 py-6 sm:px-10 sm:py-8 md:px-16 md:py-10 rounded-xl flex flex-col items-center gap-2 sm:gap-3 active:scale-95 transition-transform max-w-[90vw] text-center"
            >
              <span className="text-2xl sm:text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">
                [ Initiate Pulse ]
              </span>
              <span className="text-[9px] sm:text-[10px] md:text-xs font-medium monospace text-white/60 uppercase tracking-widest">
                Accelerated sub-cortical training • 10-node batch
              </span>
            </motion.button>
          </div>
        </GlassCard>
      </div>

      {/* ZONE 2: THE HEAVY ARTILLERY CAROUSEL (Bottom 25%) */}
      <div className="flex-1 min-h-[140px] sm:min-h-0">
        <div className="h-full flex gap-3 sm:gap-6 overflow-x-auto scrollbar-hide pb-2">
          
          {/* Card 0: Can you play like a champ? */}
          <ArtilleryCard 
            title="Can you play like a champ?"
            subtext="GARRY KASPAROV // LEGEND STYLE"
            hook="TACTICAL FORKS & STYLE DNA"
            titleColor="text-tritium-gold"
            hookColor="text-amber-400"
            onClick={() => onNavigate('CHAMPION')}
          />

          <ArtilleryCard 
            title="THE CRUCIBLE"
            subtext="10-MIN ENGINE FIGHT"
            hook="TARGET WEAKNESSES LOADED"
            titleColor="text-tritium-gold"
            hookColor="text-terminal-green"
            onClick={() => onNavigate('CRUCIBLE')}
          />

          {/* Card 2: Vengeance Mode */}
          <ArtilleryCard 
            title="VENGEANCE"
            subtext="FIX YOUR BLUNDERS"
            hook="PULLING LICHESS DATA"
            titleColor="text-molten-copper"
            hookColor="text-muted-grey"
            onClick={() => onNavigate('CRUCIBLE')}
          />

          {/* Card 3: Blindfold Gym */}
          <ArtilleryCard 
            title="BLINDFOLD GYM"
            subtext="SPATIAL DRILLS"
            hook="PIECES VANISH MOVE 4"
            titleColor="text-titanium"
            hookColor="text-muted-grey"
            onClick={() => onNavigate('BLINDFOLD')}
          />

          {/* Card 4: Puzzle Lab */}
          <ArtilleryCard 
            title="PUZZLE LAB"
            subtext="LICHESS ENGINE"
            hook="DAILY TACTICS LOADED"
            titleColor="text-terminal-green"
            hookColor="text-terminal-green"
            onClick={handleInitiatePuzzle}
          />

        </div>
      </div>

      {/* Global CSS for scrollbar hiding */}
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}

function ArtilleryCard({ 
  title, 
  subtext, 
  hook, 
  titleColor, 
  hookColor, 
  onClick 
}: { 
  title: string, 
  subtext: string, 
  hook: string, 
  titleColor: string,
  hookColor: string,
  onClick: () => void
}) {
  return (
    <button 
      onClick={onClick}
      className="h-full min-w-[240px] xs:min-w-[270px] sm:min-w-[300px] md:min-w-[320px] group shrink-0 cursor-pointer"
    >
      <GlassCard className="h-full p-4 sm:p-6 flex flex-col justify-between text-left transition-all group-hover:bg-white/[0.05] active:scale-[0.98]">
        <div className="space-y-1">
          <h4 className={cn("text-xs sm:text-sm font-black uppercase tracking-widest", titleColor)}>
            [ {title} ]
          </h4>
          <p className="text-[9px] sm:text-[10px] font-medium monospace text-titanium/60 uppercase tracking-widest">
            {subtext}
          </p>
        </div>
        
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <div className={cn("w-1 h-1 rounded-full bg-current", hookColor)} />
          <span className={cn("text-[8px] font-black uppercase tracking-[0.2em]", hookColor)}>
            {hook}
          </span>
        </div>
      </GlassCard>
    </button>
  );
}
