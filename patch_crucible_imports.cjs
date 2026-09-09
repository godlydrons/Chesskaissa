const fs = require('fs');
let content = fs.readFileSync('src/components/Crucible.tsx', 'utf-8');

content = content.replace(
  'import { cn } from \'../lib/utils\';',
  'import { Settings, X } from \'lucide-react\';\nimport { cn } from \'../lib/utils\';'
);

// Verify initialTimeMs replacement was done
const hasInitialTimeMs = content.includes('}, [initialTimeMs]);');
if (!hasInitialTimeMs) {
  content = content.replace(
    '    }\n  }, []);',
    '    }\n  }, [initialTimeMs]);'
  );
}

fs.writeFileSync('src/components/Crucible.tsx', content);
console.log('Patched imports and deps');
