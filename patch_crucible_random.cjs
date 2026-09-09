const fs = require('fs');
let content = fs.readFileSync('src/components/Crucible.tsx', 'utf-8');

const target = `        // Find endgame puzzles or fallback to any
        let suitable = data.filter(p => (p.Themes || '').toLowerCase().includes('endgame'));
        if (suitable.length === 0) suitable = data;
        
        const randomPuzzle = suitable[Math.floor(Math.random() * suitable.length)];`;

const replacement = `        // Find endgame puzzles or fallback to any
        let suitable = data.filter(p => (p.Themes || '').toLowerCase().includes('endgame'));
        if (suitable.length === 0) suitable = data;
        
        // Exclude completed
        try {
          const completed = JSON.parse(localStorage.getItem('crucible_completed') || '[]');
          const uncompleted = suitable.filter(p => !completed.includes(p.PuzzleId || p.id));
          if (uncompleted.length > 0) {
            suitable = uncompleted;
          }
        } catch(e) {}
        
        const randomPuzzle = suitable[Math.floor(Math.random() * suitable.length)];`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/Crucible.tsx', content);
  console.log("Patched Crucible random puzzle selection");
} else {
  console.log("Could not find target block");
}
