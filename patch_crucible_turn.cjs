const fs = require('fs');
let content = fs.readFileSync('src/components/Crucible.tsx', 'utf-8');

const target = `  const handleMove = (source: string, target: string) => {
    if (status !== 'READY' && status !== 'SCRAMBLE') return false;

    const testGame = new Chess(game.fen());`;

const replacement = `  const handleMove = (source: string, target: string) => {
    if (status !== 'READY' && status !== 'SCRAMBLE') return false;
    
    const currentPuzzle = stateRef.current.puzzle;
    const playerSide = currentPuzzle ? new Chess(currentPuzzle.FEN).turn() : 'w';
    if (game.turn() !== playerSide) return false;

    const testGame = new Chess(game.fen());`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/Crucible.tsx', content);
  console.log("Patched Crucible turn");
} else {
  console.log("Could not find target");
}
