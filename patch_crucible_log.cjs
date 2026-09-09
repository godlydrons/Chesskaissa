const fs = require('fs');
let content = fs.readFileSync('src/components/Crucible.tsx', 'utf-8');

content = content.replace(
  'const handleMove = (source: string, target: string) => {',
  'const handleMove = (source: string, target: string) => {\n    console.log("handleMove", source, target, status, stateRef.current.game.turn(), playerSide);'
);

content = content.replace(
  '    if (stateRef.current.game.turn() !== playerSide) {',
  '    if (stateRef.current.game.turn() !== playerSide) {\n      console.log("REJECTED: NOT PLAYER TURN");'
);

content = content.replace(
  '      return false;\n    }\n    if (status !== \'SCRAMBLE\') {',
  '      return false;\n    }\n    console.log("PASSED TURN CHECK");\n    if (status !== \'SCRAMBLE\') {'
);

fs.writeFileSync('src/components/Crucible.tsx', content);
console.log('Patched');
