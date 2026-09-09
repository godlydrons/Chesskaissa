const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf-8');
app = app.replace("Target,", "Target,\n  Map,");
fs.writeFileSync('src/App.tsx', app);
console.log("Patched Map import");
