const fs = require('fs');
let content = fs.readFileSync('src/components/RepertoireCity.tsx', 'utf8');

// Replace renderCityGrid
const oldRenderCityGridMatch = content.match(/const renderCityGrid = \(treeData: any\) => \{[\s\S]*?const getMockTree = \(\) => \{/);
if (!oldRenderCityGridMatch) {
  console.error("Could not find renderCityGrid");
  process.exit(1);
}
const oldRenderCityGrid = oldRenderCityGridMatch[0].replace('const getMockTree = () => {', '');

const newRenderCityGrid = `
  const renderCityGrid = (treeData: any) => {
    if (!svgRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); 
    
    // Deep radar-like background
    svg.append("rect")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", "#020617");

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 5])
        .on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);
    
    // Center the maze
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(1.0));

    const root = d3.hierarchy(treeData);
    
    // Radial Maze Layout
    const radiusStep = 160; // Widened gap so moves are legible
    
    const treeLayout = d3.tree<any>()
        .size([2 * Math.PI, 1]) 
        .separation((a, b) => (a.parent === b.parent ? 1 : 1.5) / (a.depth || 1));
        
    treeLayout(root);

    // Coordinate conversion
    const polarToCartesian = (angle: number, radius: number) => {
      return [radius * Math.cos(angle - Math.PI/2), radius * Math.sin(angle - Math.PI/2)];
    };

    // Draw concentric radar rings (faint)
    const maxDepth = root.height || 1;
    for(let i=1; i<=maxDepth; i++) {
       g.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", i * radiusStep)
        .attr("fill", "none")
        .attr("stroke", "rgba(56, 189, 248, 0.03)")
        .attr("stroke-width", 1)
        .attr("class", "pointer-events-none");
    }

    const links = root.links();
    
    // Fast Glow Technique: Render thick semi-transparent bottom layer for mastered paths
    g.selectAll(".link-glow")
        .data(links.filter(d => {
           const mastery = d.target.data.mastery_score || 0;
           return mastery >= 80 || d.target.depth < 4;
        }))
        .join("path")
        .attr("class", "link-glow pointer-events-none")
        .attr("d", d => {
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
        })
        .attr("fill", "none")
        .attr("stroke", "rgba(56, 189, 248, 0.25)")
        .attr("stroke-width", 10); // Thick blur simulation

    // Render Main Maze Paths (Edges)
    g.selectAll(".link")
        .data(links)
        .join("path")
        .attr("class", "link pointer-events-none")
        .attr("d", d => {
            const a0 = d.source.x;
            const r0 = d.source.y * radiusStep;
            const a1 = d.target.x;
            const r1 = d.target.y * radiusStep;
            
            const [sx, sy] = polarToCartesian(a0, r0);
            const [cx, cy] = polarToCartesian(a0, r1);
            const [tx, ty] = polarToCartesian(a1, r1);
            
            let diff = (a1 - a0) % (2 * Math.PI);
            if (diff < -Math.PI) diff += 2 * Math.PI;
            if (diff > Math.PI) diff -= 2 * Math.PI;
            
            const sweepFlag = diff > 0 ? 1 : 0;
            const largeArcFlag = Math.abs(diff) > Math.PI ? 1 : 0;
            
            return \`M \${sx} \${sy} L \${cx} \${cy} A \${r1} \${r1} 0 \${largeArcFlag} \${sweepFlag} \${tx} \${ty}\`;
        })
        .attr("fill", "none")
        .attr("stroke", (d: any) => {
           const mastery = d.target.data.mastery_score || 0;
           return (mastery >= 80 || d.target.depth < 4) ? "#38bdf8" : "rgba(148, 163, 184, 0.2)";
        }) 
        .attr("stroke-width", (d: any) => {
           const mastery = d.target.data.mastery_score || 0;
           return (mastery >= 80 || d.target.depth < 4) ? 2 : 1.5;
        });

    // Render Maze Turns (Nodes)
    const node = g.selectAll(".node")
        .data(root.descendants())
        .join("g")
        .attr("class", "node group")
        .attr("transform", d => {
            const [x, y] = polarToCartesian(d.x, d.y * radiusStep);
            return \`translate(\${x},\${y})\`;
        })
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            // Reconstruct PGN
            const pathNodes = d.ancestors().reverse();
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
            const pgnString = pgnMoves.join(" ");
            if (onTrainLine && pgnString) {
                onTrainLine(pgnString);
            }
        })
        .on("mouseover", function(event, d: any) {
            d3.select(this).select("circle.node-bg")
              .transition().duration(200)
              .attr("r", 12)
              .attr("fill", "#f8fafc");
              
            d3.select(this).select(".hover-hint")
              .transition().duration(200)
              .style("opacity", 1);
        })
        .on("mouseout", function(event, d: any) {
            const mastery = d.data.mastery_score || 0;
            const isMastered = mastery >= 80 || d.depth < 4;
            d3.select(this).select("circle.node-bg")
              .transition().duration(200)
              .attr("r", isMastered ? 6 : 4)
              .attr("fill", isMastered ? "#38bdf8" : "#475569");
              
            d3.select(this).select(".hover-hint")
              .transition().duration(200)
              .style("opacity", 0);
        });

    node.each(function(d: any) {
        const el = d3.select(this);
        const mastery = d.data.mastery_score || 0;
        const isMastered = mastery >= 80 || d.depth < 4;
        
        // Circular turn node
        el.append("circle")
          .attr("class", "node-bg")
          .attr("r", isMastered ? 6 : 4)
          .attr("fill", isMastered ? "#38bdf8" : "#475569")
          .attr("stroke", "#0f172a")
          .attr("stroke-width", 1.5);
          
        // Move Label
        // Widen the gap makes text much more legible.
        // We will rotate the text to face the outer edge for a true circular read, or keep it flat. 
        // Flat is easier to read. We add a dark background to make text pop against grid.
        
        const labelText = d.data.san || d.data.move || d.data.name || (d.depth === 0 ? "START" : "");
        
        if (labelText) {
            // Text shadow via multiple strokes (much faster than drop-shadow filter)
            el.append("text")
              .attr("y", 22) 
              .attr("text-anchor", "middle")
              .text(labelText)
              .attr("fill", "none")
              .attr("stroke", "#020617")
              .attr("stroke-width", 4)
              .attr("stroke-linejoin", "round")
              .attr("font-family", "sans-serif")
              .attr("font-size", d.depth === 0 ? "14px" : "13px")
              .attr("font-weight", isMastered ? "800" : "600")
              .attr("class", "pointer-events-none");
              
            el.append("text")
              .attr("y", 22) 
              .attr("text-anchor", "middle")
              .text(labelText)
              .attr("fill", isMastered ? "#ffffff" : "#cbd5e1")
              .attr("font-family", "sans-serif")
              .attr("font-size", d.depth === 0 ? "14px" : "13px")
              .attr("font-weight", isMastered ? "800" : "600")
              .attr("class", "pointer-events-none");
        }
          
        // Hover hint to train variation
        if (d.depth > 0) {
          el.append("text")
            .attr("class", "hover-hint pointer-events-none")
            .attr("y", -16)
            .attr("text-anchor", "middle")
            .text("Train Line")
            .attr("fill", "#38bdf8")
            .attr("font-family", "mono")
            .attr("font-size", "11px")
            .attr("font-weight", "bold")
            .style("opacity", 0);
        }
    });
  };
`;

content = content.replace(oldRenderCityGrid, newRenderCityGrid);

fs.writeFileSync('src/components/RepertoireCity.tsx', content);
console.log("Updated RepertoireCity.tsx successfully!");
