const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace("import { RepertoireMap } from './components/RepertoireMap';\n", "");
content = content.replace("              {mode === 'MAP' && (<RepertoireMap onNodeClick={(fen) => console.log('Selected MAP node:', fen)} />)}\n", "");

fs.writeFileSync('src/App.tsx', content);
console.log("Removed RepertoireMap from App.tsx");
