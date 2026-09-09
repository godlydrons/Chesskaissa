const fs = require('fs');
const files = [
  'src/components/Crucible.tsx',
  'src/components/Forge.tsx',
  'src/components/BlindfoldGym.tsx',
  'src/components/AnalysisBoard.tsx',
  'src/components/Matrix.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Replace max-w-[500px] or max-w-[550px] with responsive widths
  content = content.replace(/w-full max-w-\[500px\]/g, 'w-full max-w-[calc(100vw-2rem)] md:max-w-[500px]');
  content = content.replace(/w-full max-w-\[550px\]/g, 'w-full max-w-[calc(100vw-2rem)] md:max-w-[550px]');
  
  // Also fix Matrix which might use max-w-xl
  
  fs.writeFileSync(file, content);
  console.log("Patched", file);
}
