const fs = require('fs');
let content = fs.readFileSync('src/components/Crucible.tsx', 'utf-8');

content = content.replace(
  '    console.log("handleMove", source, target, status, stateRef.current.game.turn(), playerSide);',
  ''
);

content = content.replace(
  '    const playerSide = currentPuzzle ? new Chess(currentPuzzle.FEN).turn() : \'w\';',
  '    const playerSide = currentPuzzle ? new Chess(currentPuzzle.FEN).turn() : \'w\';\n    console.log("handleMove", source, target, status, stateRef.current.game.turn(), playerSide);'
);

fs.writeFileSync('src/components/Crucible.tsx', content);
