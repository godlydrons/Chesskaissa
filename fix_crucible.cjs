const fs = require('fs');
let content = fs.readFileSync('src/components/Crucible.tsx', 'utf-8');

// 1. Add time settings
const importsTarget = `import {
  Zap,
  ChevronLeft,`;
const importsReplacement = `import {
  Zap,
  ChevronLeft,
  Settings,
  X,`;
content = content.replace(importsTarget, importsReplacement);

const stateTarget = `  const [status, setStatus] = useState<'LOADING' | 'READY' | 'SCRAMBLE' | 'TERMINATED' | 'SUCCESS'>('LOADING');
  const [playerTime, setPlayerTime] = useState(30000);
  const [engineTime, setEngineTime] = useState(30000);`;
const stateReplacement = `  const [status, setStatus] = useState<'LOADING' | 'READY' | 'SCRAMBLE' | 'TERMINATED' | 'SUCCESS'>('LOADING');
  
  // Time controls
  const [showSettings, setShowSettings] = useState(false);
  const [initialTimeMs, setInitialTimeMs] = useState(30000);
  const [incrementMs, setIncrementMs] = useState(0);
  
  const [playerTime, setPlayerTime] = useState(30000);
  const [engineTime, setEngineTime] = useState(30000);`;
content = content.replace(stateTarget, stateReplacement);

// 2. Fix fetchEndgame logic
const fetchTarget = `  const fetchEndgame = useCallback(async () => {
    setStatus('LOADING');
    setTitanCores(0);
    setErrorMsg(null);
    setPlayerTime(30000);
    setEngineTime(30000);

    const fallbackPuzzles = [`;
const fetchReplacement = `  const fetchEndgame = useCallback(async () => {
    setStatus('LOADING');
    setTitanCores(0);
    setErrorMsg(null);
    setPlayerTime(initialTimeMs);
    setEngineTime(initialTimeMs);

    const fallbackPuzzles = [`;
content = content.replace(fetchTarget, fetchReplacement);

const supabaseFetchTarget = `    try {
      // Query for endgame puzzles
      const { data, error } = await supabase
        .from('puzzles')
        .select('*')
        .ilike('Themes', '%endgame%')
        .limit(10);

      if (error) throw error;
      if (data && data.length > 0) {
        const randomPuzzle = data[Math.floor(Math.random() * data.length)];
        const normalized = {
          PuzzleId: randomPuzzle.PuzzleId || randomPuzzle.id,
          FEN: randomPuzzle.FEN || randomPuzzle.starting_fen,
          Moves: randomPuzzle.Moves || randomPuzzle.moves,
          Rating: randomPuzzle.Rating || 1500
        };
        
        const initialGame = new Chess(normalized.FEN);
        setPuzzle(normalized);
        setGame(initialGame);
        setStatus('READY');
      } else {
        startWithFallback();
      }
    } catch (err) {`;
const supabaseFetchReplacement = `    try {
      // Query for endgame puzzles
      const { data, error } = await supabase
        .from('puzzles')
        .select('*')
        .limit(1000); // Fetch a large batch to randomize

      if (error) throw error;
      if (data && data.length > 0) {
        // Find endgame puzzles or fallback to any
        let suitable = data.filter(p => (p.Themes || '').toLowerCase().includes('endgame'));
        if (suitable.length === 0) suitable = data;
        
        const randomPuzzle = suitable[Math.floor(Math.random() * suitable.length)];
        
        // Deep mapping
        const findField = (row: any, targets: string[]) => {
          const keys = Object.keys(row);
          for (const t of targets) {
            const match = keys.find(k => k.toLowerCase().trim() === t.toLowerCase().trim());
            if (match) return row[match];
          }
          return null;
        };

        const normalized = {
          PuzzleId: findField(randomPuzzle, ['PuzzleId', 'puzzleid', 'id', 'Puzzle Id']),
          FEN: findField(randomPuzzle, ['FEN', 'fen', 'starting_fen', 'initial_fen', 'Starting FEN']),
          Moves: findField(randomPuzzle, ['Moves', 'moves', 'move_sequence']),
          Rating: parseInt(findField(randomPuzzle, ['Rating', 'rating', 'Elo', 'Difficulty']) || '1500', 10)
        };
        
        const initialGame = new Chess(normalized.FEN);
        // Play the opponent's blunder if there are moves, to reach the endgame position
        if (normalized.Moves) {
           const firstMove = normalized.Moves.split(' ')[0];
           try {
             initialGame.move(firstMove);
           } catch(e) {
             // fallback if move invalid
           }
        }
        
        // Update the FEN to the actual position the player starts from
        normalized.FEN = initialGame.fen();
        
        setPuzzle(normalized);
        setGame(initialGame);
        setStatus('READY');
      } else {
        startWithFallback();
      }
    } catch (err) {`;
content = content.replace(supabaseFetchTarget, supabaseFetchReplacement);

// 3. Increment logic in tick and handleMove
const tickTarget = `    if (isPlayerTurn) {
      setPlayerTime(prev => {
        const nextTime = Math.max(0, prev - delta);`;
const tickReplacement = `    if (isPlayerTurn) {
      setPlayerTime(prev => {
        const nextTime = Math.max(0, prev - delta);`;
content = content.replace(tickTarget, tickReplacement);

const handleMoveTarget = `        setGame(testGame);
        stateRef.current.game = testGame;
        soundEngine.play(move.captured ? 'capture' : 'move');
        
        if (!matchesSolution) {
          lastMoveWasAlternativeRef.current = true;
        } else {
          lastMoveWasAlternativeRef.current = false;
        }
        
        checkGameStatus(testGame, 'SCRAMBLE');
        return true;`;
const handleMoveReplacement = `        setGame(testGame);
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
        return true;`;
content = content.replace(handleMoveTarget, handleMoveReplacement);

// Need to also add increment to engine time when engine moves
const engineMoveTarget = `          const result = newGame.move({ from, to, promotion });
          if (result) {
            setGame(newGame);
            stateRef.current.game = newGame;
            soundEngine.play(result.captured ? 'capture' : 'move');
            checkGameStatus(newGame, currentStatus);
          }`;
const engineMoveReplacement = `          const result = newGame.move({ from, to, promotion });
          if (result) {
            setGame(newGame);
            stateRef.current.game = newGame;
            soundEngine.play(result.captured ? 'capture' : 'move');
            setEngineTime(prev => prev + incrementMs);
            checkGameStatus(newGame, currentStatus);
          }`;
content = content.replace(engineMoveTarget, engineMoveReplacement);

fs.writeFileSync('src/components/Crucible.tsx', content);
console.log('Done replacement');
