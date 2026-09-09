const fs = require('fs');
let file = fs.readFileSync('src/components/CommandCenter.tsx', 'utf-8');
file = file.replace('<div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-12 max-w-4xl mx-auto w-full">', '<div className="flex-1 w-full h-full overflow-y-auto scrollbar-hide flex flex-col">\n      <div className="flex flex-col justify-center min-h-full p-4 md:p-6 pb-32 md:pb-32 space-y-12 max-w-4xl mx-auto w-full">');
file = file.replace('    </div>\n  );\n};', '      </div>\n    </div>\n  );\n};');
fs.writeFileSync('src/components/CommandCenter.tsx', file);
console.log("Patched CommandCenter");
