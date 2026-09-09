const fs = require('fs');
let content = fs.readFileSync('src/components/RepertoireMap.tsx', 'utf8');

content = content.replace(
  "app = new PIXI.Application({",
  "app = new PIXI.Application();\n        await app.init({"
);

content = content.replace(
  "containerRef.current!.appendChild(app.view as any);",
  "containerRef.current!.appendChild(app.canvas as any);"
);

content = content.replace(
  "masteredNodes.filters = [new BloomFilter(8, 2) as any];",
  "masteredNodes.filters = []; // [new BloomFilter(8, 2) as any];"
);

fs.writeFileSync('src/components/RepertoireMap.tsx', content);
console.log("Patched Pixi setup for v8");
