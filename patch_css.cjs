const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf-8');

css = css.replace('@apply fixed bottom-6 left-1/2 -translate-x-1/2 rounded-[8px] px-6 py-3 flex items-center gap-8 z-[100] bg-white/[0.02] backdrop-blur-[24px] border border-white/[0.1] shadow-2xl;',
                  '@apply fixed bottom-6 left-1/2 -translate-x-1/2 rounded-[8px] px-4 md:px-6 py-3 flex items-center gap-4 sm:gap-6 md:gap-8 z-[100] bg-white/[0.02] backdrop-blur-[24px] border border-white/[0.1] shadow-2xl w-[90vw] sm:w-auto max-w-[400px] sm:max-w-max overflow-x-auto scrollbar-hide;');

fs.writeFileSync('src/index.css', css);
console.log("Patched index.css");
