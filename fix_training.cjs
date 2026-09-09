const fs = require('fs');
let content = fs.readFileSync('src/hooks/useTrainingEngine.ts', 'utf8');
const oldStartTraining = content.match(/const startTraining = useCallback\(\(\) => \{[\s\S]*?dagRoot\]\);/)[0];
const newStartTraining = `const startTraining = useCallback(() => {
    setCurrentLoop(1);
    setStepInLoop(0);
    setStatus('TRACING');
    setLogs([]);
    addLog(\`[ COMPILING REPERTOIRE: \${openingMoves.length || 'DAG'} MOVES ]\`);
    resetToStart();
  }, [openingMoves, addLog, resetToStart]);`;
content = content.replace(oldStartTraining, newStartTraining);
fs.writeFileSync('src/hooks/useTrainingEngine.ts', content);
console.log('Fixed useTrainingEngine.ts');
