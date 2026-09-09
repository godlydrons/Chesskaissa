const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  "import { AnalysisBoard } from './components/AnalysisBoard';",
  "import { AnalysisBoard } from './components/AnalysisBoard';\nimport { RepertoireCity } from './components/RepertoireCity';"
);

content = content.replace(
  "{mode === 'ANALYSIS' && (",
  "{mode === 'MAP' && (\n                <RepertoireCity onBack={() => setMode('COMMAND')} />\n              )}\n              {mode === 'ANALYSIS' && ("
);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx with RepertoireCity");
