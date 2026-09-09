const fs = require('fs');

// 1. Fix Crucible.tsx alert
let crucible = fs.readFileSync('src/components/Crucible.tsx', 'utf-8');
crucible = crucible.replace('alert("Move Error: " + e);', '');
fs.writeFileSync('src/components/Crucible.tsx', crucible);

// 2. Fix AnalysisBoard.tsx .move(history[i])
let analysis = fs.readFileSync('src/components/AnalysisBoard.tsx', 'utf-8');
analysis = analysis.replace('tempGame.move(history[i]);', 'tempGame.move(history[i].san);');
analysis = analysis.replace('newGame.move(history[i]);', 'newGame.move(history[i].san);');
fs.writeFileSync('src/components/AnalysisBoard.tsx', analysis);

console.log("Patched errors");
