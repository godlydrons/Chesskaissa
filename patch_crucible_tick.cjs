const fs = require('fs');
let content = fs.readFileSync('src/components/Crucible.tsx', 'utf-8');

const target = `  const tick = (now: number) => {
    if (stateRef.current.status !== 'SCRAMBLE') return;

    const delta = now - lastTickRef.current;
    lastTickRef.current = now;
    
    // Only tick player's clock when it is their turn
    const currentGame = stateRef.current.game;
    const currentPuzzle = stateRef.current.puzzle;
    const playerSide = currentPuzzle ? new Chess(currentPuzzle.FEN).turn() : 'w';

    if (currentGame.turn() === playerSide) {
      setPlayerTime(prev => {
        const nextTime = Math.max(0, prev - delta);
        if (nextTime === 0) {
          terminateGame("TEMPORAL_BREACH: TIME_EXPIRED");
          return 0;
        }
        return nextTime;
      });
    } else {
      setEngineTime(prev => {
        const nextTime = Math.max(0, prev - delta);
        if (nextTime === 0) {
          handlePlayerWin();
          return 0;
        }
        return nextTime;
      });
    }

    // Capture current timerRef so we can recurse (use a ref for tick too? React handles it fine usually but this is safer)
    timerRef.current = requestAnimationFrame((n) => tick(n));
  };`;

const replacement = `  const tick = (now: number) => {
    if (stateRef.current.status !== 'SCRAMBLE') return;

    const delta = now - lastTickRef.current;
    lastTickRef.current = now;
    
    // Only tick player's clock when it is their turn
    const currentGame = stateRef.current.game;
    const currentPuzzle = stateRef.current.puzzle;
    const playerSide = currentPuzzle ? new Chess(currentPuzzle.FEN).turn() : 'w';

    let didTimeout = false;
    let didWin = false;

    if (currentGame.turn() === playerSide) {
      setPlayerTime(prev => {
        const nextTime = Math.max(0, prev - delta);
        if (nextTime === 0) didTimeout = true;
        return nextTime;
      });
    } else {
      setEngineTime(prev => {
        const nextTime = Math.max(0, prev - delta);
        if (nextTime === 0) didWin = true;
        return nextTime;
      });
    }

    if (didTimeout) {
      terminateGame("TEMPORAL_BREACH: TIME_EXPIRED");
      return;
    }
    if (didWin) {
      handlePlayerWin();
      return;
    }

    // Capture current timerRef so we can recurse (use a ref for tick too? React handles it fine usually but this is safer)
    timerRef.current = requestAnimationFrame((n) => tick(n));
  };`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/Crucible.tsx', content);
  console.log("Patched Crucible tick function");
} else {
  console.log("Could not find tick target block");
}
