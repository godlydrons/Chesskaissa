const fs = require('fs');
let content = fs.readFileSync('src/components/Crucible.tsx', 'utf-8');

const targetHeader = `        <div className="flex items-center gap-8">
           <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest">Titan_Cores</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-slate-100">{titanCores}</span>
              <Zap className={cn("w-3 h-3 transition-colors", titanCores > 0 ? "text-yellow-400" : "text-slate-800")} />
            </div>
          </div>
        </div>
      </header>`;

const replacementHeader = `        <div className="flex items-center gap-6">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 border border-slate-800 hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
           <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest">Titan_Cores</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-slate-100">{titanCores}</span>
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
      </AnimatePresence>`;

content = content.replace(targetHeader, replacementHeader);

fs.writeFileSync('src/components/Crucible.tsx', content);
console.log('Added settings');
