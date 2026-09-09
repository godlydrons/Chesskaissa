const fs = require('fs');
const content = fs.readFileSync('src/components/BlindfoldGym.tsx', 'utf-8');

const target = `  // Core Data Retrieval via Supabase
  const fetchPuzzle = useCallback(async () => {
    setStatus('LOADING');
    setErrorStatus(null);
    setTerminalValue("");
    setRevelationFen(null);
    setHighlightedSquares([]);
    
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('puzzles')
        .select('*')
        .ilike('Room', 'Blindfold')
        .limit(20);

      if (error) throw error;
      if (!data || data.length === 0) {
        setErrorStatus("DB_EMPTY");
        setStatus('FAILED');
        return;
      }

      const selected = data[Math.floor(Math.random() * data.length)];
          
      // DEEP MAPPING: Handle casing, whitespace, and variants
      const findField = (row: any, targets: string[]) => {
        const keys = Object.keys(row);
        for (const t of targets) {
          const match = keys.find(k => k.toLowerCase().trim() === t.toLowerCase().trim());
          if (match) return row[match];
        }
        return null;
      };

      const normalized = {
        PuzzleId: findField(selected, ['PuzzleId', 'puzzleid', 'id', 'Puzzle Id']),
        FEN: findField(selected, ['FEN', 'fen', 'starting_fen', 'initial_fen', 'Starting FEN', 'FEN ']),
        Moves: findField(selected, ['Moves', 'moves', 'move_sequence', 'Moves ', 'Sequence']),
        Rating: findField(selected, ['Rating', 'rating', 'Elo', 'Difficulty']) || 0
      };

      console.log("Supabase Normalized Puzzle:", normalized);
      setPuzzle(normalized);
      setStatus('ACTIVE');
    } catch (err: any) {
      console.error(err);
      setErrorStatus("SYNC_ERROR");
      setStatus('FAILED');
    }
  }, []);`;

const replacement = `  const [blindfoldRating, setBlindfoldRating] = useState(1000);

  // Core Data Retrieval via Supabase
  const fetchPuzzle = useCallback(async () => {
    setStatus('LOADING');
    setErrorStatus(null);
    setTerminalValue("");
    setRevelationFen(null);
    setHighlightedSquares([]);
    
    if (!supabase) return;

    try {
      // Fetch a larger pool to find suitable puzzles
      const { data, error } = await supabase
        .from('puzzles')
        .select('*')
        .ilike('Room', 'Blindfold')
        .limit(100);

      if (error) throw error;
      if (!data || data.length === 0) {
        setErrorStatus("DB_EMPTY");
        setStatus('FAILED');
        return;
      }

      // DEEP MAPPING: Handle casing, whitespace, and variants
      const findField = (row: any, targets: string[]) => {
        const keys = Object.keys(row);
        for (const t of targets) {
          const match = keys.find(k => k.toLowerCase().trim() === t.toLowerCase().trim());
          if (match) return row[match];
        }
        return null;
      };

      const normalizedList = data.map(row => ({
        PuzzleId: findField(row, ['PuzzleId', 'puzzleid', 'id', 'Puzzle Id']),
        FEN: findField(row, ['FEN', 'fen', 'starting_fen', 'initial_fen', 'Starting FEN', 'FEN ']),
        Moves: findField(row, ['Moves', 'moves', 'move_sequence', 'Moves ', 'Sequence']),
        Rating: parseInt(findField(row, ['Rating', 'rating', 'Elo', 'Difficulty']) || '1000', 10)
      }));

      // Filter puzzles that are at least long enough for our depth
      let suitablePuzzles = normalizedList.filter(p => p.Moves && p.Moves.split(' ').length > blindfoldDepth);
      
      if (suitablePuzzles.length === 0) {
        suitablePuzzles = normalizedList; // Fallback to all if none are long enough
      }

      // Sort by how close they are to current rating
      suitablePuzzles.sort((a, b) => Math.abs(a.Rating - blindfoldRating) - Math.abs(b.Rating - blindfoldRating));

      // Pick from the top 5 closest matches
      const topMatches = suitablePuzzles.slice(0, 5);
      const selected = topMatches[Math.floor(Math.random() * topMatches.length)];

      console.log("Supabase Normalized Puzzle:", selected);
      setPuzzle(selected);
      setStatus('ACTIVE');
    } catch (err: any) {
      console.error(err);
      setErrorStatus("SYNC_ERROR");
      setStatus('FAILED');
    }
  }, [blindfoldDepth, blindfoldRating]);`;

const newContent = content.replace(target, replacement);
if (newContent === content) {
  console.log('Target not found!');
} else {
  fs.writeFileSync('src/components/BlindfoldGym.tsx', newContent);
  console.log('Successfully replaced!');
}
