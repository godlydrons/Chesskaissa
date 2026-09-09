const { Chess } = require('chess.js');
const c = new Chess();
try {
  const m = c.move({ from: 'e2', to: 'e4', promotion: 'q' });
  console.log('moved:', m);
} catch(e) {
  console.log('error:', e);
}
