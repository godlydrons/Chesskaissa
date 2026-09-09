const polarToCartesian = (angle, radius) => {
  return [radius * Math.cos(angle - Math.PI/2), radius * Math.sin(angle - Math.PI/2)];
};

const drawMazePath = (source, target) => {
  const r0 = source.y;
  const a0 = source.x;
  const r1 = target.y;
  const a1 = target.x;
  const rMid = (r0 + r1) / 2;
  
  const [sx, sy] = polarToCartesian(a0, r0);
  const [tx, ty] = polarToCartesian(a1, r1);
  const [mx0, my0] = polarToCartesian(a0, rMid);
  const [mx1, my1] = polarToCartesian(a1, rMid);
  
  const sweepFlag = a1 > a0 ? 1 : 0;
  let diff = Math.abs(a1 - a0);
  if (diff > Math.PI) diff = 2 * Math.PI - diff; // shortest path
  const largeArcFlag = diff > Math.PI ? 1 : 0;
  
  return `M ${sx} ${sy} L ${mx0} ${my0} A ${rMid} ${rMid} 0 ${largeArcFlag} ${sweepFlag} ${mx1} ${my1} L ${tx} ${ty}`;
}
console.log(drawMazePath({x: 0, y: 0}, {x: Math.PI/4, y: 100}));
