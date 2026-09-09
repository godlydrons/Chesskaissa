const fs = require('fs');
let content = fs.readFileSync('src/components/Crucible.tsx', 'utf-8');

const target = `  const handlePlayerWin = () => {
    setStatus('SUCCESS');
    stateRef.current.status = 'SUCCESS';
    setTitanCores(prev => prev + 1);`;

const replacement = `  const handlePlayerWin = () => {
    setStatus('SUCCESS');
    stateRef.current.status = 'SUCCESS';
    setTitanCores(prev => prev + 1);
    
    // Save to local storage
    if (stateRef.current.puzzle) {
      try {
        const completed = JSON.parse(localStorage.getItem('crucible_completed') || '[]');
        completed.push(stateRef.current.puzzle.PuzzleId);
        localStorage.setItem('crucible_completed', JSON.stringify(completed));
      } catch(e) {}
    }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/Crucible.tsx', content);
  console.log("Patched win logic");
} else {
  console.log("Could not find target block for win logic");
}
