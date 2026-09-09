const fs = require('fs');
let content = fs.readFileSync('src/components/Crucible.tsx', 'utf-8');

const targetHandleMove = `  const handleMove = (source: string, target: string) => {
    const playerSide = currentPuzzle ? new Chess(currentPuzzle.FEN).turn() : 'w';
    console.log("handleMove", source, target, status, stateRef.current.game.turn(), playerSide);
    
    // Prevent player from moving engine's pieces
    if (stateRef.current.game.turn() !== playerSide) {
      console.log("REJECTED: NOT PLAYER TURN");
      return false;
    }
    console.log("PASSED TURN CHECK");
    if (status !== 'SCRAMBLE') {
      if (status === 'READY') {
        // First move starts scramble
        const testGame = new Chess(game.fen());
        try {
          const move = testGame.move({ from: source, to: target, promotion: 'q' });
          if (move) {
            setGame(testGame);
            stateRef.current.game = testGame;
            
            // Add increment
            setPlayerTime(prev => prev + incrementMs);
            
            startScramble();
            checkGameStatus(testGame, 'SCRAMBLE');
            return true;
          }
        } catch (e) {
          console.error("Move Error:", e); alert("Move Error: " + e);
        }
      }
      return false;
    }

    const testGame = new Chess(game.fen());
    try {
      const currentHistoryLength = game.history().length;
      const expectedMoveUci = puzzle?.Moves ? puzzle.Moves.split(' ')[currentHistoryLength] : null;
      const move = testGame.move({ from: source, to: target, promotion: 'q' });
      if (move) {
        const playedUci = move.from + move.to + (move.promotion || '');
        const matchesSolution = expectedMoveUci ? (playedUci === expectedMoveUci) : false;
        
        setGame(testGame);
        stateRef.current.game = testGame;
        soundEngine.play(move.captured ? 'capture' : 'move');
        
        // Add increment
        setPlayerTime(prev => prev + incrementMs);
        
        if (!matchesSolution) {
          lastMoveWasAlternativeRef.current = true;
        } else {
          lastMoveWasAlternativeRef.current = false;
        }
        
        checkGameStatus(testGame, 'SCRAMBLE');
        return true;
      }
    } catch (e) {
          console.error("Move Error:", e); alert("Move Error: " + e);
    }
    return false;
  };`;

const replacementHandleMove = `  const handleMove = (source: string, target: string) => {
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
  };`;

// Because the original string might not perfectly match due to my multiple replacements, I'll use regex or manual replacement.
