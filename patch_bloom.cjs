const fs = require('fs');
let content = fs.readFileSync('src/components/RepertoireMap.tsx', 'utf8');

content = content.replace(
  "import { BloomFilter } from '@pixi/filter-bloom';",
  "// import { BloomFilter } from '@pixi/filter-bloom';"
);

content = content.replace(
  "masteredNodes.filters = [new BloomFilter(8, 2) as any];",
  "masteredNodes.filters = []; // [new BloomFilter(8, 2) as any];"
);

fs.writeFileSync('src/components/RepertoireMap.tsx', content);
