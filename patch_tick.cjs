const fs = require('fs');
let content = fs.readFileSync('src/components/Crucible.tsx', 'utf-8');

const target = `  const tick = (now: number) => {
    if (stateRef.current.status !== 'SCRAMBLE') return;

    const delta = now - lastTickRef.current;
    lastTickRef.current = now;
    
    // Only tick player's clock when it is their turn
    const playerSide = stateRef.current.puzzle ? new Chess(stateRef.current.puzzle.FEN).turn() : 'w';
    const isPlayerTurn = stateRef.current.game.turn() === playerSide;

    if (isPlayerTurn) {
      setPlayerTime(prev => {
        const nextTime = Math.max(0, prev - delta);
        
        // AUDIO ESCALATION
        if (nextTime < 15000 && stateRef.current.status === 'SCRAMBLE') {
          const beatInterval = nextTime < 5000 ? 300 : 800; // Fast vs Normal beat
          const lastBeatTime = (window as any)._lastBeat || 0;
          
          if (now - lastBeatTime > beatInterval) {
            soundEngine.play('heartbeat');
            (window as any)._lastBeat = now;
          }
        }
        
        if (nextTime < 5000 && stateRef.current.status === 'SCRAMBLE') {
          const tinnitusPlayed = (window as any)._tinnitusPlayed || false;
          if (!tinnitusPlayed) {
            soundEngine.play('tinnitus');
            (window as any)._tinnitusPlayed = true;
          }
        }

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
    const playerSide = stateRef.current.puzzle ? new Chess(stateRef.current.puzzle.FEN).turn() : 'w';
    const isPlayerTurn = stateRef.current.game.turn() === playerSide;

    let nextPlayerTime = -1;
    let nextEngineTime = -1;

    if (isPlayerTurn) {
      setPlayerTime(prev => {
        nextPlayerTime = Math.max(0, prev - delta);
        return nextPlayerTime;
      });
    } else {
      setEngineTime(prev => {
        nextEngineTime = Math.max(0, prev - delta);
        return nextEngineTime;
      });
    }

    // Wait until state functions have run to do side-effects. 
    // In React 18 setState from requestAnimationFrame might be synchronous but the updater itself shouldn't have side effects.
    // Instead of risking updater scoping, we can just defer side effects.
    setTimeout(() => {
      if (nextPlayerTime !== -1) {
        if (nextPlayerTime < 15000 && stateRef.current.status === 'SCRAMBLE') {
          const beatInterval = nextPlayerTime < 5000 ? 300 : 800;
          const lastBeatTime = (window as any)._lastBeat || 0;
          if (now - lastBeatTime > beatInterval) {
            soundEngine.play('heartbeat');
            (window as any)._lastBeat = now;
          }
        }
        if (nextPlayerTime < 5000 && stateRef.current.status === 'SCRAMBLE') {
          const tinnitusPlayed = (window as any)._tinnitusPlayed || false;
          if (!tinnitusPlayed) {
            soundEngine.play('tinnitus');
            (window as any)._tinnitusPlayed = true;
          }
        }
        if (nextPlayerTime === 0 && stateRef.current.status === 'SCRAMBLE') {
          terminateGame("TEMPORAL_BREACH: TIME_EXPIRED");
        }
      }

      if (nextEngineTime === 0 && stateRef.current.status === 'SCRAMBLE') {
        handlePlayerWin();
      }
    }, 0);

    timerRef.current = requestAnimationFrame((n) => tick(n));
  };`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/Crucible.tsx', content);
  console.log("Patched tick side-effects");
} else {
  console.log("Could not find tick target block");
}
