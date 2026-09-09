const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(/newMode: 'COMMAND' \| 'ARENA' \| 'CRUCIBLE' \| 'MATRIX' \| 'RECON' \| 'VAULT' \| 'BLINDFOLD' \| 'FORGE' \| 'MAP'/g,
                  "newMode: 'COMMAND' | 'ARENA' | 'CRUCIBLE' | 'MATRIX' | 'RECON' | 'VAULT' | 'BLINDFOLD' | 'FORGE' | 'MAP' | 'ANALYSIS'");

app = app.replace(/<MapIcon className="w-6 h-6" \/>/g, '<Map className="w-6 h-6" />');
app = app.replace("import { Target, Skull, Search, LayoutDashboard, Layers, Database, Map as MapIcon }", "import { Target, Skull, Search, LayoutDashboard, Layers, Database, Map }");

// And also fix the mode state type if it's missing 'ANALYSIS' or 'MAP'
app = app.replace(/useState\<'COMMAND' \| 'ARENA' \| 'CRUCIBLE' \| 'MATRIX' \| 'RECON' \| 'VAULT' \| 'BLINDFOLD' \| 'FORGE' \| 'ANALYSIS' \| 'MAP'\>/g,
                  "useState<'COMMAND' | 'ARENA' | 'CRUCIBLE' | 'MATRIX' | 'RECON' | 'VAULT' | 'BLINDFOLD' | 'FORGE' | 'ANALYSIS' | 'MAP'>");

fs.writeFileSync('src/App.tsx', app);

let mapFile = fs.readFileSync('src/components/RepertoireMap.tsx', 'utf-8');
mapFile = mapFile.replace('masteredNodes.filters = [new BloomFilter(8, 2)];', 'masteredNodes.filters = [new BloomFilter(8, 2) as any];');
fs.writeFileSync('src/components/RepertoireMap.tsx', mapFile);
console.log("Patched App.tsx and Map");
