const fs = require('fs');
let analysis = fs.readFileSync('src/components/AnalysisBoard.tsx', 'utf-8');
analysis = analysis.replace(/<main className="flex-1 flex flex-col md:flex-row min-w-0 overflow-y-auto overflow-x-hidden">/g,
                    '<main className="flex-1 flex flex-col md:flex-row min-w-0 overflow-hidden">');
analysis = analysis.replace(/className="shrink-0 md:flex-1 flex flex-col items-center justify-center min-w-0 w-full p-4 md:p-8 bg-\[#020617\] relative overflow-y-auto min-h-0"/g,
                    'className="flex-1 min-h-0 flex flex-col items-center justify-center w-full p-4 md:p-8 bg-[#020617] relative overflow-hidden"');
analysis = analysis.replace(/className="w-full max-w-\[calc\(100vw-2rem\)\] md:max-w-\[500px\] aspect-square shrink-0 relative shadow-2xl"/g,
                    'className="w-full max-w-[min(100%,45vh)] md:max-w-[500px] aspect-square shrink-0 relative shadow-2xl"');
analysis = analysis.replace(/className="w-full md:w-\[350px\] lg:w-\[400px\] bg-[#050914] border-t md:border-t-0 md:border-l border-white\/5 flex flex-col shrink-0 min-w-0"/g,
                    'className="h-[45vh] md:h-auto w-full md:w-[350px] lg:w-[400px] bg-[#050914] border-t md:border-t-0 md:border-l border-white/5 flex flex-col shrink-0 min-w-0"');
fs.writeFileSync('src/components/AnalysisBoard.tsx', analysis);

let matrix = fs.readFileSync('src/components/Matrix.tsx', 'utf-8');
matrix = matrix.replace(/<main className="flex-1 flex flex-col md:flex-row min-w-0 overflow-y-auto overflow-x-hidden relative">/g,
                    '<main className="flex-1 flex flex-col md:flex-row min-w-0 overflow-hidden relative">');
matrix = matrix.replace(/className="shrink-0 md:flex-1 flex flex-col items-center justify-center min-w-0 w-full p-4 md:p-8 relative overflow-y-auto min-h-0"/g,
                    'className="flex-1 min-h-0 flex flex-col items-center justify-center w-full p-4 md:p-8 relative overflow-hidden"');
matrix = matrix.replace(/className="w-full max-w-\[calc\(100vw-2rem\)\] md:max-w-\[500px\] aspect-square shrink-0 relative bg-void\/50 p-2 border border-white\/5 shadow-2xl"/g,
                    'className="w-full max-w-[min(100%,45vh)] md:max-w-[500px] aspect-square shrink-0 relative bg-void/50 p-2 border border-white/5 shadow-2xl"');
matrix = matrix.replace(/className="w-full md:w-\[400px\] lg:w-\[500px\] bg-slate-950\/80 backdrop-blur-md border-t md:border-t-0 md:border-l border-white\/5 flex flex-col shrink-0 min-w-0 z-10"/g,
                    'className="h-[45vh] md:h-auto w-full md:w-[400px] lg:w-[500px] bg-slate-950/80 backdrop-blur-md border-t md:border-t-0 md:border-l border-white/5 flex flex-col shrink-0 min-w-0 z-10"');
fs.writeFileSync('src/components/Matrix.tsx', matrix);
console.log("Patched Analysis and Matrix");
