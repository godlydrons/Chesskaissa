const fs = require('fs');
let content = fs.readFileSync('src/components/RepertoireCity.tsx', 'utf8');

// 1. Fix PGN reconstruction in handleMasterEntireCluster
const oldPgnMaster = `         for (let i = 1; i < pathNodes.length; i++) {
           if (i % 2 !== 0) {
             pgnMoves.push(\`\${moveNumber}. \${pathNodes[i].data.san}\`);
           } else {
             pgnMoves.push(\`\${pathNodes[i].data.san}\`);
             moveNumber++;
           }
         }`;

const newPgnMaster = `         for (let i = 1; i < pathNodes.length; i++) {
           const moveText = pathNodes[i].data.san || pathNodes[i].data.move || pathNodes[i].data.name || "";
           if (i % 2 !== 0) {
             pgnMoves.push(\`\${moveNumber}. \${moveText}\`);
           } else {
             pgnMoves.push(\`\${moveText}\`);
             moveNumber++;
           }
         }`;

content = content.replace(oldPgnMaster, newPgnMaster);

// 2. Fix PGN reconstruction in the single node click
const oldPgnSingle = `            for (let i = 1; i < pathNodes.length; i++) {
              if (i % 2 !== 0) {
                pgnMoves.push(\`\${moveNumber}. \${pathNodes[i].data.san}\`);
              } else {
                pgnMoves.push(\`\${pathNodes[i].data.san}\`);
                moveNumber++;
              }
            }`;

const newPgnSingle = `            for (let i = 1; i < pathNodes.length; i++) {
              const moveText = pathNodes[i].data.san || pathNodes[i].data.move || pathNodes[i].data.name || "";
              if (i % 2 !== 0) {
                pgnMoves.push(\`\${moveNumber}. \${moveText}\`);
              } else {
                pgnMoves.push(\`\${moveText}\`);
                moveNumber++;
              }
            }`;
content = content.replace(oldPgnSingle, newPgnSingle);

// 3. Fix the link path generation to use d3.linkRadial with smooth curves and proper depth scaling.
const oldPathCode = `        .attr("d", d => {
            const a0 = d.source.x;
            const r0 = d.source.y * radiusStep;
            const a1 = d.target.x;
            const r1 = d.target.y * radiusStep;
            
            const [sx, sy] = polarToCartesian(a0, r0);
            const [cx, cy] = polarToCartesian(a0, r1); // Outward radial
            const [tx, ty] = polarToCartesian(a1, r1); // Then angular arc
            
            let diff = (a1 - a0) % (2 * Math.PI);
            if (diff < -Math.PI) diff += 2 * Math.PI;
            if (diff > Math.PI) diff -= 2 * Math.PI;
            
            const sweepFlag = diff > 0 ? 1 : 0;
            const largeArcFlag = Math.abs(diff) > Math.PI ? 1 : 0;
            
            return \`M \${sx} \${sy} L \${cx} \${cy} A \${r1} \${r1} 0 \${largeArcFlag} \${sweepFlag} \${tx} \${ty}\`;
        })`;

const newPathCode = `        .attr("d", d3.linkRadial<any, any>()
            .angle(d => d.x)
            .radius(d => (d.depth || 0) * radiusStep)
        )`;

// Replace it for BOTH link-glow and link
content = content.replace(oldPathCode, newPathCode);
content = content.replace(oldPathCode, newPathCode);

// 4. Fix node transform
const oldNodeTransform = `        .attr("transform", d => {
            const [x, y] = polarToCartesian(d.x, d.y * radiusStep);
            return \`translate(\${x},\${y})\`;
        })`;

const newNodeTransform = `        .attr("transform", d => {
            const [x, y] = polarToCartesian(d.x, (d.depth || 0) * radiusStep);
            return \`translate(\${x},\${y})\`;
        })`;

content = content.replace(oldNodeTransform, newNodeTransform);

fs.writeFileSync('src/components/RepertoireCity.tsx', content);
console.log('Fixed maze links, spacing, and PGNs');
