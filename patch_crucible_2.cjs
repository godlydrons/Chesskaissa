const fs = require('fs');
let content = fs.readFileSync('src/components/Crucible.tsx', 'utf-8');

// Fix imports
content = content.replace(
  'import { Activity, Zap, ChevronLeft, Trophy, AlertTriangle } from \'lucide-react\';',
  'import { Activity, Zap, ChevronLeft, Trophy, AlertTriangle, Settings, X } from \'lucide-react\';'
);

// Fix initialGame.move to use object {from, to, promotion}
const oldMoveTarget = `        if (normalized.Moves) {
           const firstMove = normalized.Moves.split(' ')[0];
           try {
             initialGame.move(firstMove);
           } catch(e) {
             // fallback if move invalid
           }
        }`;
const newMoveReplacement = `        if (normalized.Moves) {
           const firstMove = normalized.Moves.split(' ')[0];
           try {
             initialGame.move({
               from: firstMove.substring(0, 2),
               to: firstMove.substring(2, 4),
               promotion: firstMove.length > 4 ? firstMove.substring(4) : undefined
             });
           } catch(e) {
             console.error("Failed to make initial move", e);
           }
        }`;
content = content.replace(oldMoveTarget, newMoveReplacement);

// Fix useCallback dependency for fetchEndgame
content = content.replace(
  '}, [fetchEndgame]);',
  '}, [fetchEndgame, initialTimeMs]);'
);
content = content.replace(
  '  const fetchEndgame = useCallback(async () => {',
  '  const fetchEndgame = useCallback(async () => {'
);
// I need to change `}, []);` for fetchEndgame to `}, [initialTimeMs]);`
// Let's find where fetchEndgame closes.
const fetchEndgameEnd = `    }
  }, []);`;
const fetchEndgameEndReplacement = `    }
  }, [initialTimeMs]);`;
content = content.replace(fetchEndgameEnd, fetchEndgameEndReplacement);

// Update supabase query for randomness
const oldQuery = `      const { data, error } = await supabase
        .from('puzzles')
        .select('*')
        .limit(1000); // Fetch a large batch to randomize`;

const newQuery = `      // Fetch random block of puzzles to avoid repetition
      const randomOffset = Math.floor(Math.random() * 5000);
      const { data, error } = await supabase
        .from('puzzles')
        .select('*')
        .ilike('Themes', '%endgame%')
        .range(randomOffset, randomOffset + 50);`;
content = content.replace(oldQuery, newQuery);

fs.writeFileSync('src/components/Crucible.tsx', content);
console.log('Patched');
