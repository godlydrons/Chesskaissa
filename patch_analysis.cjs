const fs = require('fs');
let content = fs.readFileSync('src/components/AnalysisBoard.tsx', 'utf-8');
content = content.replace('if (isEditorMode) return true;', 'if (isEditorMode) { try { const g = new Chess(game.fen()); g.move({ from: sourceSquare, to: targetSquare, promotion: "q" }); setGame(g); return true; } catch(e) { return false; } }');
fs.writeFileSync('src/components/AnalysisBoard.tsx', content);
