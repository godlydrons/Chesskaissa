const fs = require('fs');
let content = fs.readFileSync('src/components/RepertoireCity.tsx', 'utf8');

// 1. Add currentTree state
content = content.replace(
  "const [activeRegion, setActiveRegion] = useState<any | null>(null);",
  "const [activeRegion, setActiveRegion] = useState<any | null>(null);\n  const [currentTree, setCurrentTree] = useState<any>(null);"
);

// 2. Set currentTree state when building tree
content = content.replace(
  "const tree = buildTreeFromNodes(data);",
  "const tree = buildTreeFromNodes(data);\n      setCurrentTree(tree);"
);
content = content.replace(
  "renderCityGrid(getMockTree());",
  "const mt = getMockTree();\n        setCurrentTree(mt);\n        renderCityGrid(mt);"
);

// 3. Add handleMasterEntireCluster function
const handleFunc = `
  const handleMasterEntireCluster = () => {
     if (!currentTree || !onTrainLine) return;
     const d3Root = d3.hierarchy(currentTree);
     const leaves = d3Root.leaves();
     const pgns = leaves.map((leaf: any) => {
         const pathNodes = leaf.ancestors().reverse();
         let pgnMoves = [];
         let moveNumber = 1;
         for (let i = 1; i < pathNodes.length; i++) {
           if (i % 2 !== 0) {
             pgnMoves.push(\`\${moveNumber}. \${pathNodes[i].data.san}\`);
           } else {
             pgnMoves.push(\`\${pathNodes[i].data.san}\`);
             moveNumber++;
           }
         }
         return pgnMoves.join(" ");
     });
     
     onTrainLine(pgns.join("\\n\\n"));
  };
`;
content = content.replace(
  "const getFamily = (name: string) => {",
  handleFunc + "\n  const getFamily = (name: string) => {"
);

// 4. Import Play icon
content = content.replace(
  "import { Loader2, Globe, ArrowLeft, Map as MapIcon } from 'lucide-react';",
  "import { Loader2, Globe, ArrowLeft, Map as MapIcon, Play } from 'lucide-react';"
);

// 5. Add Button to UI
const buttonCode = `
         {viewState === 'REGION' && (
           <button 
             onClick={handleMasterEntireCluster}
             className="flex items-center gap-2 bg-emerald-950 border border-emerald-800 px-4 py-2 rounded-sm hover:bg-emerald-900 transition-colors text-emerald-400 hover:text-white group shadow-lg shadow-emerald-900/20"
           >
             <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
             <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Master Entire Cluster</span>
           </button>
         )}
`;
content = content.replace(
  "{viewState === 'REGION' && (\n             <div className=\"flex items-center gap-2 bg-slate-900/80",
  buttonCode + "\n         {viewState === 'REGION' && (\n             <div className=\"flex items-center gap-2 bg-slate-900/80"
);

// 6. Fix Text Rotation to stop overlapping
const oldTextCode = `
            el.append("text")
              .attr("y", 22) 
              .attr("text-anchor", "middle")
              .text(labelText)
`;
const newTextCode = `
            el.append("text")
              .attr("transform", (d: any) => {
                 let degrees = (d.x * 180 / Math.PI) - 90;
                 if (degrees > 90 || degrees < -90) {
                     return \`rotate(\${degrees + 180}) translate(-15, 0)\`;
                 } else {
                     return \`rotate(\${degrees}) translate(15, 0)\`;
                 }
              })
              .attr("dy", "0.31em")
              .attr("text-anchor", (d: any) => {
                 let degrees = (d.x * 180 / Math.PI) - 90;
                 return (degrees > 90 || degrees < -90) ? "end" : "start";
              })
              .text(labelText)
`;
// Replace first one
content = content.replace(oldTextCode, newTextCode);
// Replace second one
content = content.replace(oldTextCode, newTextCode);

// Also update radius scale and spacing to be safer
content = content.replace(
  "const radiusStep = 160; // Widened gap so moves are legible",
  "const radiusStep = 160; // Widened gap so moves are legible\n    const maxDepth = d3.max(root.descendants(), d => d.depth) || 1;"
);
// Fix d3.tree layout angular spread based on number of leaves
// Since size is [2 * Math.PI, 1], we don't need to change tree size.
// The text rotation fixes the text overlap completely!

fs.writeFileSync('src/components/RepertoireCity.tsx', content);
console.log('Fixed RepertoireCity.tsx');
