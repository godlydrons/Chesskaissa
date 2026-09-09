import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { THEME } from '../theme';
import { cn } from '../lib/utils';

type ReconState = 'IDLE' | 'SCANNING' | 'COMPLETE';

interface ReconLabProps {
  onBack: () => void;
  onLoadCurriculum: () => void;
}

/**
 * CAISSA-CORE: RECON LAB
 * The Offensive Intelligence Terminal.
 * Strict 3-phase state machine.
 */
export function ReconLab({ onBack, onLoadCurriculum }: ReconLabProps) {
  const [state, setState] = useState<ReconState>('IDLE');
  const [targetId, setTargetId] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  // State 2: Scanning Logic
  useEffect(() => {
    if (state === 'SCANNING') {
      const scanLogs = [
        "> Bypassing unrated architecture...",
        "> Isolating structural panic indices...",
        "> Running NNUE depth-22 evaluations...",
        "> Mapping psychological phobias...",
        "> Compiling Relic Weapon...",
        "> Scan Complete. Decrypting Dossier..."
      ];

      let currentLogIndex = 0;
      const logInterval = setInterval(() => {
        if (currentLogIndex < scanLogs.length) {
          setLogs(prev => [...prev, scanLogs[currentLogIndex]]);
          currentLogIndex++;
        } else {
          clearInterval(logInterval);
        }
      }, 400);

      const timer = setTimeout(() => {
        setState('COMPLETE');
      }, 3000);

      return () => {
        clearTimeout(timer);
        clearInterval(logInterval);
      };
    }
  }, [state]);

  return (
    <div className="h-full w-full bg-void relative overflow-hidden flex flex-col">
      
      {/* Back Navigation (Optional but helpful for UX) */}
      {state === 'IDLE' && (
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 sm:top-8 sm:left-8 z-50 text-[10px] font-black uppercase tracking-widest text-muted-grey hover:text-titanium transition-colors cursor-pointer"
        >
          [ EXIT_LAB ]
        </button>
      )}

      <AnimatePresence mode="wait">
        
        {/* STATE 1: IDLE (The Ambush) */}
        {state === 'IDLE' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 pb-28 sm:pb-6"
          >
            <GlassCard className="w-full max-w-md p-0 overflow-hidden border-white/10">
              <div className="p-5 sm:p-8 space-y-6 sm:space-y-8">
                <div className="space-y-1 sm:space-y-2">
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-titanium">The Ambush</h2>
                  <p className="text-[10px] font-medium monospace text-tritium-gold uppercase tracking-widest">Target Acquisition Terminal</p>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    placeholder="> ENTER TARGET LICHESS ID_"
                    className="w-full bg-transparent border-0 rounded-none px-0 py-3 sm:py-4 text-base sm:text-xl font-medium monospace text-titanium placeholder:text-muted-grey focus:outline-none focus:ring-0"
                    autoFocus
                  />
                  <div className="absolute bottom-0 left-0 w-full h-[1px] bg-white/10" />
                </div>

                <button
                  onClick={() => targetId && setState('SCANNING')}
                  className="w-full bg-tritium-gold py-4 sm:py-6 flex items-center justify-center active:scale-95 transition-transform cursor-pointer rounded"
                >
                  <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-void">
                    [ Initiate Deep Scan ]
                  </span>
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* STATE 2: SCANNING (The Deep Forge) */}
        {state === 'SCANNING' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 p-12 flex flex-col font-mono"
          >
            <div className="space-y-2">
              {logs.map((log, i) => (
                <p key={i} className="text-xs text-muted-grey monospace leading-relaxed">
                  {log}
                </p>
              ))}
              <motion.div 
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="w-2 h-4 bg-tritium-gold inline-block"
              />
            </div>
          </motion.div>
        )}

        {/* STATE 3: COMPLETE (The Dossier Drop) */}
        {state === 'COMPLETE' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col p-6 space-y-6 max-w-2xl mx-auto w-full overflow-y-auto scrollbar-hide"
          >
            <div className="pt-8 pb-4">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-titanium">The Dossier</h2>
              <p className="text-[10px] font-medium monospace text-tritium-gold uppercase tracking-widest">Target: @{targetId}</p>
            </div>

            {/* Card 1: Psychometrics */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <GlassCard className="p-6 border-molten-copper/30">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-molten-copper mb-3">[ GLASS JAW INDEX ]</h3>
                <p className="text-sm font-medium monospace text-titanium leading-relaxed">
                  Evaluation collapses 42% faster post-blunder.
                </p>
              </GlassCard>
            </motion.div>

            {/* Card 2: Structural Phobia */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <GlassCard className="p-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-titanium mb-3">[ ACHILLES HEEL ]</h3>
                <p className="text-sm font-medium monospace text-muted-grey leading-relaxed">
                  Isolated Queen's pawn. Win rate drops to 18%.
                </p>
              </GlassCard>
            </motion.div>

            {/* Card 3: Relic Weapon */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <GlassCard className="p-6 border-tritium-gold/30">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-tritium-gold mb-3">[ KILL CURRICULUM ]</h3>
                <p className="text-sm font-medium monospace text-titanium leading-relaxed">
                  Deploying vintage transpositional traps.
                </p>
              </GlassCard>
            </motion.div>

            {/* Execution Button */}
            <div className="pt-4 sm:pt-6 pb-28 sm:pb-12">
              <button
                onClick={onLoadCurriculum}
                className="w-full bg-tritium-gold py-4 sm:py-6 flex items-center justify-center active:scale-95 transition-transform cursor-pointer rounded"
              >
                <span className="text-sm sm:text-base md:text-lg font-black uppercase tracking-widest text-void text-center px-2">
                  [ Load Data into Crucible ]
                </span>
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Global CSS for scrollbar hiding */}
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
