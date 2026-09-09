const fs = require('fs');
let file = fs.readFileSync('src/components/Crucible.tsx', 'utf-8');

file = file.replace(/<main className="flex-1 relative flex flex-col items-center justify-start md:justify-center w-full min-w-0 overflow-y-auto overflow-x-hidden p-4">/g,
                    '<main className="flex-1 relative flex flex-col items-center justify-between md:justify-center w-full min-w-0 overflow-hidden p-4 pb-24 md:pb-4">');

file = file.replace(/className="relative w-full max-w-\[calc\(100vw-2rem\)\] md:max-w-\[500px\] aspect-square transition-all shrink-0 duration-300"/g,
                    'className="relative w-full max-w-[min(100%,45vh)] md:max-w-[500px] aspect-square transition-all shrink-0 duration-300 my-auto"');
                    
file = file.replace(/<div className="mt-12 w-full flex flex-col gap-4">/g,
                    '<div className="mt-4 md:mt-12 w-full max-w-[500px] flex flex-col gap-4 overflow-y-auto h-[30vh] md:h-auto shrink-0 border-t border-white/5 pt-4">');

file = file.replace(/<div className="flex justify-between items-end border-t border-white\/5 pt-4">/g,
                    '<div className="flex justify-between items-end pt-2">');

fs.writeFileSync('src/components/Crucible.tsx', file);

let forge = fs.readFileSync('src/components/Forge.tsx', 'utf-8');
forge = forge.replace(/<main className="flex-1 relative flex flex-col items-center justify-start md:justify-center w-full min-w-0 overflow-y-auto overflow-x-hidden p-4">/g,
                    '<main className="flex-1 relative flex flex-col items-center justify-between md:justify-center w-full min-w-0 overflow-hidden p-4 pb-24 md:pb-4">');
forge = forge.replace(/className="relative w-full max-w-\[calc\(100vw-2rem\)\] md:max-w-\[500px\] aspect-square shrink-0"/g,
                    'className="relative w-full max-w-[min(100%,45vh)] md:max-w-[500px] aspect-square shrink-0 my-auto"');
forge = forge.replace(/<div className="mt-12 w-full flex justify-between items-end border-t border-white\/5 pt-4">/g,
                    '<div className="mt-4 md:mt-12 w-full max-w-[500px] flex justify-between items-end border-t border-white/5 pt-4 shrink-0">');
fs.writeFileSync('src/components/Forge.tsx', forge);
console.log("Patched Crucible and Forge");
