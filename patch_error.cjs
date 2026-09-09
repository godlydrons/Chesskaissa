const fs = require('fs');
let content = fs.readFileSync('src/components/RepertoireMap.tsx', 'utf8');

content = content.replace(
  "setError(e.message);",
  "setError(e.stack || e.message);"
);

fs.writeFileSync('src/components/RepertoireMap.tsx', content);
