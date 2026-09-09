import React from 'react';
import { GlassCard } from './GlassCard';
import { THEME } from '../theme';
import { cn } from '../lib/utils';

interface CommandCenterProps {
  onNavigate?: (mode: 'COMMAND' | 'VAULT' | 'ARENA' | 'CRUCIBLE' | 'MATRIX' | 'RECON' | 'ATLAS' | 'BLINDFOLD' | 'FORGE' | 'ANALYSIS' | 'MAP' | 'CHAMPION') => void;
}

/**
 * CAISSA-CORE: COMMAND CENTER
 * The Executive Hub for high-fidelity chess telemetry.
 * Strictly adheres to the "Dark Luxury" aesthetic.
 */
export const CommandCenter = ({ onNavigate }: CommandCenterProps) => {
  return (
    <div className="flex-1 w-full h-full overflow-y-auto scrollbar-hide flex flex-col">
      <div className="flex flex-col justify-center min-h-full p-3 sm:p-4 md:p-6 pb-28 sm:pb-32 space-y-8 sm:space-y-12 max-w-4xl mx-auto w-full">
      
      {/* ZONE 1: THE APEX METRIC (READINESS RING) */}
      <section className="flex flex-col items-center justify-center pt-4 sm:pt-8">
        <div className="relative w-52 h-52 sm:w-64 sm:h-64 flex items-center justify-center mx-auto">
          {/* Circular Progress Ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 256 256">
            <circle
              cx="128"
              cy="128"
              r="120"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="4"
            />
            <circle
              cx="128"
              cy="128"
              r="120"
              fill="none"
              stroke="url(#readinessGradient)"
              strokeWidth="6"
              strokeDasharray="754"
              strokeDashoffset={754 * (1 - 0.874)}
              strokeLinecap="butt"
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="readinessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#A0A5B5" />
                <stop offset="100%" stopColor={THEME.colors.state.mastery} />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Telemetry Data */}
          <span className="text-4xl sm:text-5xl font-medium monospace text-titanium tracking-tight">
            87.4%
          </span>
        </div>
        
        {/* Narrative Label */}
        <h2 className="mt-6 sm:mt-8 text-xs sm:text-sm font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-titanium text-center">
          Tournament Readiness
        </h2>
      </section>

      {/* ZONE 2: THE TACTICAL DIRECTIVE (DYNAMIC NUDGE) */}
      <section>
        <GlassCard 
          className="p-4 sm:p-6 border-molten-copper/50 shadow-[inset_0_0_20px_rgba(231,76,60,0.05)]"
          style={{ borderColor: THEME.colors.state.decay }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
            <div className="space-y-1.5 sm:space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-molten-copper">
                [ Neural Decay Detected ]
              </h3>
              <p className="text-xs sm:text-sm monospace text-muted-grey leading-relaxed">
                14 critical variations in the Sicilian Najdorf are degrading.
              </p>
            </div>
            
            <button 
              onClick={() => onNavigate?.('CRUCIBLE')}
              className="self-stretch sm:self-end md:self-center px-6 py-3 border border-tritium-gold bg-transparent transition-all hover:bg-tritium-gold/5 active:scale-95 text-center cursor-pointer"
            >
              <span className="text-[10px] font-medium monospace text-tritium-gold uppercase tracking-widest">
                [ Initiate Repair ]
              </span>
            </button>
          </div>
        </GlassCard>
      </section>

      {/* ZONE 3: ROI TELEMETRY (FINANCIAL-GRADE GRAPHS) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Card 1: Blunder Velocity */}
        <GlassCard className="p-4 sm:p-6 flex flex-col h-44 sm:h-48 overflow-hidden">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-titanium mb-4 sm:mb-8">
            [ Blunder Velocity ]
          </h3>
          <div className="flex-1 relative w-full overflow-hidden">
            {/* Minimal Descending Line Chart */}
            <svg className="w-full h-full" viewBox="0 0 350 100" preserveAspectRatio="none">
              <path
                d="M 0 10 L 50 25 L 100 20 L 150 45 L 200 40 L 250 65 L 300 60 L 350 85"
                fill="none"
                stroke={THEME.colors.state.decay}
                strokeWidth="2"
                strokeLinecap="round"
                className="w-full h-full"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M 0 10 L 50 25 L 100 20 L 150 45 L 200 40 L 250 65 L 300 60 L 350 85 V 100 H 0 Z"
                fill={`url(#blunderFill)`}
                className="opacity-10"
                vectorEffect="non-scaling-stroke"
              />
              <defs>
                <linearGradient id="blunderFill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={THEME.colors.state.decay} />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </GlassCard>

        {/* Card 2: Tactical Speed */}
        <GlassCard className="p-4 sm:p-6 flex flex-col h-44 sm:h-48 overflow-hidden">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-titanium mb-4 sm:mb-8">
            [ Tactical Speed ]
          </h3>
          <div className="flex-1 relative w-full overflow-hidden">
            {/* Minimal Ascending Line Chart */}
            <svg className="w-full h-full" viewBox="0 0 350 100" preserveAspectRatio="none">
              <path
                d="M 0 85 L 50 70 L 100 75 L 150 55 L 200 60 L 250 40 L 300 45 L 350 20"
                fill="none"
                stroke={THEME.colors.state.mastery}
                strokeWidth="2"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M 0 85 L 50 70 L 100 75 L 150 55 L 200 60 L 250 40 L 300 45 L 350 20 V 100 H 0 Z"
                fill={`url(#speedFill)`}
                className="opacity-10"
                vectorEffect="non-scaling-stroke"
              />
              <defs>
                <linearGradient id="speedFill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={THEME.colors.state.mastery} />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </GlassCard>
      </section>

      {/* ZONE 4: THE OPENING ATLAS, VAULT & ANALYSIS LAB */}
      <section className="space-y-4">
        {/* PLAY LIKE A CHAMPION CARD */}
        <GlassCard 
          className="p-4 sm:p-6 border-tritium-gold/60 shadow-[inset_0_0_35px_rgba(212,175,55,0.15)] flex-1 bg-gradient-to-br from-black/80 via-slate-950/70 to-amber-950/20"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-tritium-gold animate-pulse shadow-[0_0_10px_#D4AF37]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-tritium-gold flex items-center gap-1.5">
                  <span>[ Masterclass: Play Like A Champion ]</span>
                  <span className="text-[8px] font-mono bg-tritium-gold/20 text-tritium-gold px-1.5 py-0.5 rounded border border-tritium-gold/30">
                    KASPAROV // FISCHER // MORPHY
                  </span>
                </h3>
              </div>
              <p className="text-xs sm:text-sm monospace text-muted-grey leading-relaxed">
                Step inside the mind of Garry Kasparov and the immortals. Interactive Critical Style Forks, real-time Dynamic Radar Fingerprints, and move-by-move psychological explanations.
              </p>
            </div>
            
            <button 
              onClick={() => onNavigate?.('CHAMPION')}
              className="self-stretch sm:self-end md:self-center px-6 py-3.5 bg-tritium-gold hover:bg-white text-void font-black uppercase tracking-widest text-[11px] rounded-lg transition-all shadow-[0_0_25px_rgba(212,175,55,0.4)] active:scale-95 shrink-0 cursor-pointer text-center flex items-center justify-center gap-2"
            >
              <span>[ Master Kasparov Style ]</span>
            </button>
          </div>
        </GlassCard>

        <GlassCard 
          className="p-4 sm:p-6 border-tritium-gold/40 shadow-[inset_0_0_30px_rgba(212,175,55,0.08)] flex-1"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-tritium-gold animate-pulse shadow-[0_0_8px_#D4AF37]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-tritium-gold">
                  [ Repertoire Arsenal: PGN Vault ]
                </h3>
              </div>
              <p className="text-xs sm:text-sm monospace text-muted-grey leading-relaxed">
                Ingest PGN files, register opening lines indexed by White and Black player telemetry, and drill or export variations directly into the Matrix engine.
              </p>
            </div>
            
            <button 
              onClick={() => onNavigate?.('VAULT')}
              className="self-stretch sm:self-end md:self-center px-6 py-3.5 bg-tritium-gold hover:bg-white text-void font-black uppercase tracking-widest text-[11px] rounded-lg transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] active:scale-95 shrink-0 cursor-pointer text-center"
            >
              [ Open PGN Vault ]
            </button>
          </div>
        </GlassCard>

        <GlassCard 
          className="p-4 sm:p-6 border-cyan-500/40 shadow-[inset_0_0_30px_rgba(0,240,255,0.08)] flex-1"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400">
                  [ Cartography Engine: Opening Map ]
                </h3>
              </div>
              <p className="text-xs sm:text-sm monospace text-muted-grey leading-relaxed">
                Explore the planetary map of chess theory. Navigate opening provinces, orthogonal street grids, and avenues with zero-DOM 60FPS canvas acceleration.
              </p>
            </div>
            
            <button 
              onClick={() => onNavigate?.('MAP')}
              className="self-stretch sm:self-end md:self-center px-6 py-3.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black uppercase tracking-widest text-[11px] rounded-lg transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] active:scale-95 shrink-0 cursor-pointer text-center"
            >
              [ Launch Opening Map ]
            </button>
          </div>
        </GlassCard>

        <GlassCard 
          className="p-4 sm:p-6 border-emerald-500/50 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)] flex-1"
          style={{ borderColor: THEME.colors.state.mastery }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
            <div className="space-y-1.5 sm:space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500">
                [ Analysis & Simulation ]
              </h3>
              <p className="text-xs sm:text-sm monospace text-muted-grey leading-relaxed">
                Enter the sandbox environment. Run deep-engine evaluations, explore variations, and manipulate board states freely.
              </p>
            </div>
            
            <button 
              onClick={() => onNavigate?.('ANALYSIS')}
              className="self-stretch sm:self-end md:self-center px-6 py-3 border border-emerald-500 bg-transparent transition-all hover:bg-emerald-500/10 active:scale-95 shrink-0 cursor-pointer text-center"
            >
              <span className="text-[10px] font-medium monospace text-emerald-400 uppercase tracking-widest">
                [ Boot Sandbox ]
              </span>
            </button>
          </div>
        </GlassCard>
      </section>

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
    </div>
  );
};
