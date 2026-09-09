const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace("import { RepertoireMap } from './components/RepertoireMap';", "");
app = app.replace("import { ReconLab }", "import { RepertoireMap } from './components/RepertoireMap';\nimport { ReconLab }");

app = app.replace("import { Target, Skull, Search, LayoutDashboard, Layers, Database } from 'lucide-react';", "import { Target, Skull, Search, LayoutDashboard, Layers, Database, Map as MapIcon } from 'lucide-react';");

app = app.replace(/useState\<'COMMAND' \| 'ARENA' \| 'CRUCIBLE' \| 'MATRIX' \| 'RECON' \| 'VAULT' \| 'BLINDFOLD' \| 'FORGE' \| 'ANALYSIS'\>/g,
                  "useState<'COMMAND' | 'ARENA' | 'CRUCIBLE' | 'MATRIX' | 'RECON' | 'VAULT' | 'BLINDFOLD' | 'FORGE' | 'ANALYSIS' | 'MAP'>");

app = app.replace(/newMode: 'COMMAND' \| 'ARENA' \| 'CRUCIBLE' \| 'MATRIX' \| 'RECON' \| 'VAULT' \| 'BLINDFOLD' \| 'FORGE'/g,
                  "newMode: 'COMMAND' | 'ARENA' | 'CRUCIBLE' | 'MATRIX' | 'RECON' | 'VAULT' | 'BLINDFOLD' | 'FORGE' | 'MAP'");

app = app.replace("{mode === 'ANALYSIS' && (",
                  "{mode === 'MAP' && (<RepertoireMap onNodeClick={(fen) => console.log('Selected MAP node:', fen)} />)}\n              {mode === 'ANALYSIS' && (");

app = app.replace('label="Analyze"\n            />',
                  'label="Analyze"\n            />\n            <NavIcon active={mode === \'MAP\'} onClick={() => setMode(\'MAP\')} icon={<MapIcon className="w-6 h-6" />} label="Map" />');

fs.writeFileSync('src/App.tsx', app);
console.log("Patched App.tsx with MAP mode");
