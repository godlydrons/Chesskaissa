const fs = require('fs');
let content = fs.readFileSync('src/components/Crucible.tsx', 'utf-8');

const target = `      if (error) throw error;
      if (data && data.length > 0) {
        // Find endgame puzzles or fallback to any
        let suitable = data.filter(p => (p.Themes || '').toLowerCase().includes('endgame'));
        if (suitable.length === 0) suitable = data;
        
        // Pick random
        const p = suitable[Math.floor(Math.random() * suitable.length)];`;

const replacement = `      if (error) throw error;
      if (data && data.length > 0) {
        // Find endgame puzzles or fallback to any
        let suitable = data.filter(p => (p.Themes || '').toLowerCase().includes('endgame'));
        if (suitable.length === 0) suitable = data;
        
        // Filter out completed ones from local storage
        try {
          const completed = JSON.parse(localStorage.getItem('crucible_completed') || '[]');
          const uncompleted = suitable.filter(p => !completed.includes(p.PuzzleId));
          if (uncompleted.length > 0) {
            suitable = uncompleted;
          }
        } catch(e) {}
        
        // Pick random
        const p = suitable[Math.floor(Math.random() * suitable.length)];`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/Crucible.tsx', content);
  console.log("Patched Crucible puzzle selection");
} else {
  console.log("Could not find target");
}
