const fs = require('fs');
const files = [
  'src/components/Crucible.tsx',
  'src/components/Forge.tsx',
  'src/components/BlindfoldGym.tsx',
  'src/components/AnalysisBoard.tsx',
  'src/components/Matrix.tsx',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // Replace <main className="flex-1 ..."> with something that ensures it doesn't cause horizontal scroll
  content = content.replace(/flex-1 flex flex-col md:flex-row/g, 'flex-1 flex flex-col md:flex-row min-w-0');
  
  // Left side fix: change `flex-1` to `shrink-0 md:flex-1` so it doesn't collapse to 0 height on mobile
  content = content.replace(/className="flex-1 flex flex-col items-center justify-center/g, 'className="shrink-0 md:flex-1 flex flex-col items-center justify-center min-w-0 w-full');
  
  // Crucible/Forge main flex-1 might be shrinking too much?
  // They use `<main className="flex-1 relative flex flex-col items-center justify-center p-4">`
  content = content.replace(/<main className="flex-1 relative flex flex-col items-center justify-center/g, '<main className="flex-1 relative flex flex-col items-center justify-start md:justify-center w-full min-w-0 overflow-y-auto overflow-x-hidden');
  
  // Right side fix: ensure min-w-0 on right panel
  content = content.replace(/flex flex-col space-y-6 md:space-y-8 overflow-y-auto shrink-0/g, 'flex flex-col space-y-6 md:space-y-8 overflow-y-auto shrink-0 min-w-0');
  
  // Remove w-full from Crucible live eval log to avoid pushing width out if it's too wide
  
  fs.writeFileSync(file, content);
  console.log("Patched flex in", file);
}
