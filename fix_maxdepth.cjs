const fs = require('fs');
let content = fs.readFileSync('src/components/RepertoireCity.tsx', 'utf8');

content = content.replace(
  "const maxDepth = d3.max(root.descendants(), d => d.depth) || 1;\n    // Draw concentric radar rings (faint)\n    const maxDepth = root.height || 1;",
  "const maxDepth = root.height || 1;\n    // Draw concentric radar rings (faint)"
);

content = content.replace(
  "const maxDepth = d3.max(root.descendants(), d => (d as any).depth) || 1;\n    // Draw concentric radar rings (faint)\n    const maxDepth = root.height || 1;",
  "const maxDepth = root.height || 1;\n    // Draw concentric radar rings (faint)"
);

content = content.replace(
  "const maxDepth = d3.max(root.descendants(), d => d.depth) || 1;",
  ""
);

fs.writeFileSync('src/components/RepertoireCity.tsx', content);
console.log('Fixed maxDepth');
