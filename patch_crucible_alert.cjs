const fs = require('fs');
let content = fs.readFileSync('src/components/Crucible.tsx', 'utf-8');

content = content.replace(
  '        } catch (e) {}',
  '        } catch (e) { console.error("Move Error:", e); alert("Move Error: " + e); }'
);

content = content.replace(
  '        } catch (e) {',
  '        } catch (e) {\n          console.error("Move Error:", e); alert("Move Error: " + e);'
);

fs.writeFileSync('src/components/Crucible.tsx', content);
