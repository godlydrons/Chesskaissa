const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf-8');
app = app.replace("mode === 'COMMAND' || mode === 'ARENA' || mode === 'RECON' || mode === 'MATRIX' || mode === 'VAULT' || mode === 'ANALYSIS'",
                  "mode === 'COMMAND' || mode === 'ARENA' || mode === 'RECON' || mode === 'MATRIX' || mode === 'VAULT' || mode === 'ANALYSIS' || mode === 'MAP'");
fs.writeFileSync('src/App.tsx', app);
console.log("Patched App pill");
