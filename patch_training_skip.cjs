const fs = require('fs');
let content = fs.readFileSync('src/hooks/useTrainingEngine.ts', 'utf8');

const oldStart = `  const startTraining = useCallback(() => {
    // We remove the initialLoop skip logic. 
    // Tracing N+1 from move 1 is fundamental to Ghost & Grind, especially when force-training a specific line.
    setCurrentLoop(1);
    setStepInLoop(0);
    setStatus('TRACING');
    setLogs([]);
    addLog(\`[ COMPILING REPERTOIRE: \${openingMoves.length || 'DAG'} MOVES ]\`);
    resetToStart();
  }, [openingMoves, addLog, resetToStart]);`;

const newStart = `  const startTraining = useCallback(() => {
    let initialLoop = 1;
    
    // Auto-skip mastered loops ONLY if we are bulk-training an entire repertoire (length > 1)
    // If training a single line (length === 1), we force practice from move 1.
    if (!dagRoot && repertoireLines.length > 1) {
      for (let l = 1; l <= openingMoves.length; l++) {
        const targetIdx = getTargetIndex(l);
        if (targetIdx >= openingMoves.length) break;

        const simGame = new Chess();
        let possible = true;
        for (let i = 0; i <= targetIdx; i++) {
          try {
            simGame.move(openingMoves[i]);
          } catch (e) {
            possible = false;
            break;
          }
        }

        if (possible && masteredFens.has(simGame.fen())) {
          initialLoop = l + 1;
        } else {
          break;
        }
      }
    }

    setCurrentLoop(initialLoop);
    setStepInLoop(0);
    setStatus('TRACING');
    setLogs([]);
    addLog(\`[ COMPILING REPERTOIRE: \${openingMoves.length || 'DAG'} MOVES ]\`);
    if (initialLoop > 1) {
      addLog(\`[ GHOST_SKIP: \${initialLoop - 1} LOOPS ALREADY MASTERED ]\`, 'success');
    }
    resetToStart();
  }, [openingMoves, addLog, resetToStart, getTargetIndex, masteredFens, dagRoot, repertoireLines.length]);`;

content = content.replace(oldStart, newStart);
fs.writeFileSync('src/hooks/useTrainingEngine.ts', content);
console.log('Patched useTrainingEngine.ts');
