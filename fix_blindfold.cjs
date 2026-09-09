const fs = require('fs');
let file = fs.readFileSync('src/components/BlindfoldGym.tsx', 'utf-8');

// Fix main tag
file = file.replace(/<main className="flex-1 flex flex-col md:flex-row min-w-0 overflow-y-auto">/g, 
                    '<main className="flex-1 flex flex-col md:flex-row min-w-0 overflow-hidden">');

// Fix Left Panel
file = file.replace(/className="shrink-0 md:flex-1 flex flex-col items-center justify-center min-w-0 w-full p-4 md:p-6 lg:p-8 bg-\[radial-gradient\(circle_at_center,_var\(--tw-gradient-stops\)\)\] from-slate-900 to-slate-950 overflow-y-auto min-h-0"/g, 
                    'className="flex-1 min-h-0 flex flex-col items-center justify-center p-2 md:p-6 lg:p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950 w-full overflow-hidden"');
file = file.replace(/className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 bg-\[radial-gradient\(circle_at_center,_var\(--tw-gradient-stops\)\)\] from-slate-900 to-slate-950 overflow-y-auto min-h-0"/g,
                    'className="flex-1 min-h-0 flex flex-col items-center justify-center p-2 md:p-6 lg:p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950 w-full overflow-hidden"');

// Fix Right Panel
file = file.replace(/className="w-full md:w-\[320px\] lg:w-\[450px\] bg-slate-950 border-t md:border-t-0 md:border-l border-slate-800 p-6 md:p-8 lg:p-10 flex flex-col space-y-6 md:space-y-8 overflow-y-auto shrink-0 min-w-0"/g,
                    'className="h-[50vh] md:h-auto w-full md:w-[320px] lg:w-[450px] bg-slate-950 border-t md:border-t-0 md:border-l border-slate-800 p-4 md:p-8 lg:p-10 flex flex-col space-y-4 md:space-y-8 overflow-y-auto shrink-0 min-w-0"');

// Make sure Board is sized correctly inside Left panel
// The board has: className="w-full max-w-[calc(100vw-2rem)] md:max-w-[550px] aspect-square shrink-0 relative shadow-[0_0_100px_rgba(0,0,0,0.4)] border-8 border-slate-900 rounded-sm overflow-hidden bg-slate-900"
// I will change max-w-[calc(100vw-2rem)] to max-w-[min(100%,_40vh)] on mobile so it fits in the 50vh height
file = file.replace(/className="w-full max-w-\[calc\(100vw-2rem\)\] md:max-w-\[550px\] aspect-square shrink-0/g,
                    'className="w-full max-w-[min(100%,40vh)] md:max-w-[550px] aspect-square shrink-0');

fs.writeFileSync('src/components/BlindfoldGym.tsx', file);
console.log("Patched BlindfoldGym");
