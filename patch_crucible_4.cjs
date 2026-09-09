const fs = require('fs');
let content = fs.readFileSync('src/components/Crucible.tsx', 'utf-8');

const startIdx = content.indexOf('const handleMove = (source: string, target: string) => {');
const endIdx = content.indexOf('  const checkGameStatus =', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `const handleMove = (source: string, target: string) => {
    if (status !== 'READY' && status !== 'SCRAMBLE') return false;

    const testGame = new Chess(game.fen());
    try {
      const move = testGame.move({ from: source, to: target, promotion: 'q' });
      if (move) {
        setGame(testGame);
        stateRef.current.game = testGame;
        soundEngine.play(move.captured ? 'capture' : 'move');
        
        if (status === 'READY') {
          startScramble();
          checkGameStatus(testGame, 'SCRAMBLE');
        } else if (status === 'SCRAMBLE') {
          setPlayerTime(prev => prev + incrementMs);
          checkGameStatus(testGame, 'SCRAMBLE');
        }
        return true;
      }
    } catch (e) {
      console.error("Move Error:", e);
    }
    return false;
  };

`;

  content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
  fs.writeFileSync('src/components/Crucible.tsx', content);
  console.log("Replaced handleMove");
} else {
  console.log("Could not find bounds");
}
