const fs = require('fs');
let content = fs.readFileSync('src/components/RepertoireCity.tsx', 'utf8');

// 1. Fix buildTreeFromNodes
const oldBuildTree = `    const orphans: any[] = [];

    nodes.forEach(node => {
      const current = nodeMap.get(node.fen);
      if (!node.parent_fen || !nodeMap.has(node.parent_fen)) {
        orphans.push(current);
      } else {
        const parent = nodeMap.get(node.parent_fen);
        parent.children.push(current);
      }
    });

    if (orphans.length === 1) {
        return orphans[0];
    } else if (orphans.length > 1) {
        return { name: "Opening System", children: orphans, depth: 0 };
    }`;

const newBuildTree = `    const orphans: any[] = [];

    nodes.forEach(node => {
      const current = nodeMap.get(node.fen);
      if (!node.parent_fen || !nodeMap.has(node.parent_fen)) {
        orphans.push(current);
      } else {
        const parent = nodeMap.get(node.parent_fen);
        parent.children.push(current);
      }
    });

    const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const validOrphans = orphans.filter(o => !o.parent_fen || o.parent_fen === START_FEN || o.fen === START_FEN);

    if (validOrphans.length > 0) {
        const startNode = validOrphans.find(o => o.fen === START_FEN);
        if (startNode) return startNode;

        return {
            name: "Start",
            fen: START_FEN,
            children: validOrphans,
            depth: 0
        };
    }`;

content = content.replace(oldBuildTree, newBuildTree);

// 2. Fix PGN building in handleMasterEntireCluster
const oldPgnMaster = `         for (let i = 1; i < pathNodes.length; i++) {
           const moveText = pathNodes[i].data.san || pathNodes[i].data.move || pathNodes[i].data.name || "";
           if (i % 2 !== 0) {
             pgnMoves.push(\`\${moveNumber}. \${moveText}\`);
           } else {
             pgnMoves.push(\`\${moveText}\`);
             moveNumber++;
           }
         }`;

const newPgnMaster = `         for (let i = 1; i < pathNodes.length; i++) {
           let moveText = pathNodes[i].data.san || pathNodes[i].data.move || pathNodes[i].data.name || "";
           moveText = moveText.replace(/^\\d+\\.?\\.\\.\\.?\\s*/, "").replace(/^\\d+\\.\\s*/, "").trim();
           if (i % 2 !== 0) {
             pgnMoves.push(\`\${moveNumber}. \${moveText}\`);
           } else {
             pgnMoves.push(\`\${moveText}\`);
             moveNumber++;
           }
         }`;

content = content.replace(oldPgnMaster, newPgnMaster);

// 3. Fix PGN building in single line click
const oldPgnSingle = `            for (let i = 1; i < pathNodes.length; i++) {
              const moveText = pathNodes[i].data.san || pathNodes[i].data.move || pathNodes[i].data.name || "";
              if (i % 2 !== 0) {
                pgnMoves.push(\`\${moveNumber}. \${moveText}\`);
              } else {
                pgnMoves.push(\`\${moveText}\`);
                moveNumber++;
              }
            }`;

const newPgnSingle = `            for (let i = 1; i < pathNodes.length; i++) {
              let moveText = pathNodes[i].data.san || pathNodes[i].data.move || pathNodes[i].data.name || "";
              moveText = moveText.replace(/^\\d+\\.?\\.\\.\\.?\\s*/, "").replace(/^\\d+\\.\\s*/, "").trim();
              if (i % 2 !== 0) {
                pgnMoves.push(\`\${moveNumber}. \${moveText}\`);
              } else {
                pgnMoves.push(\`\${moveText}\`);
                moveNumber++;
              }
            }`;

content = content.replace(oldPgnSingle, newPgnSingle);

fs.writeFileSync('src/components/RepertoireCity.tsx', content);
console.log('Fixed RepertoireCity orphans and PGN generation');
