const fs = require('fs');
let content = fs.readFileSync('src/components/Chessboard.tsx', 'utf-8');

const target = `  const handleDragEnd = (event: any, info: any, fromSquare: Square) => {
    if (!boardRef.current) return;
    
    const boardRect = boardRef.current.getBoundingClientRect();
    const x = info.point.x - boardRect.left;
    const y = info.point.y - boardRect.top;`;

const replacement = `  const handleDragEnd = (event: any, info: any, fromSquare: Square) => {
    if (!boardRef.current) return;
    
    const boardRect = boardRef.current.getBoundingClientRect();
    
    // Support mouse, pointer, and touch events natively for viewport-relative coords
    let clientX = info.point.x;
    let clientY = info.point.y;
    if (event.clientX !== undefined) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else if (event.changedTouches && event.changedTouches.length > 0) {
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    }

    const x = clientX - boardRect.left;
    const y = clientY - boardRect.top;`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/Chessboard.tsx', content);
console.log('Patched Chessboard drag');
