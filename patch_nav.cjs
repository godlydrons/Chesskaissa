const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace('Database,', 'Database,\n  Target,');

const navCondition = "mode === 'COMMAND' || mode === 'ARENA' || mode === 'RECON' || mode === 'MATRIX' || mode === 'VAULT'";
app = app.replace(navCondition, navCondition + " || mode === 'ANALYSIS'");

const newNavIcon = `            <NavIcon 
              active={mode === 'VAULT'} 
              onClick={() => setMode('VAULT')} 
              icon={<Database className="w-6 h-6" />} 
              label="Vault"
            />
            <NavIcon 
              active={mode === 'ANALYSIS'} 
              onClick={() => setMode('ANALYSIS')} 
              icon={<Target className="w-6 h-6" />} 
              label="Analyze"
            />`;

app = app.replace(`<NavIcon 
              active={mode === 'VAULT'} 
              onClick={() => setMode('VAULT')} 
              icon={<Database className="w-6 h-6" />} 
              label="Vault"
            />`, newNavIcon);

fs.writeFileSync('src/App.tsx', app);
console.log("Patched nav");
