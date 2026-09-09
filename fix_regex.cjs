const fs = require('fs');
let content = fs.readFileSync('src/components/RepertoireCity.tsx', 'utf8');

const oldRegex = `replace(/^\\d+\\.?\\.\\.\\.?\\s*/, "")`;
const newRegex = `replace(/^\\d+\\.?\\s*\\.\\.\\.\\s*/, "").replace(/^\\d+\\.\\.\\.\\s*/, "")`;

content = content.replace(oldRegex, newRegex);
content = content.replace(oldRegex, newRegex);

fs.writeFileSync('src/components/RepertoireCity.tsx', content);
console.log('Fixed regex');
