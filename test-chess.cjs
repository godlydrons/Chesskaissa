const { Chess } = require('chess.js');
const chess = new Chess();
try {
  chess.move('e2e4');
  console.log("Success string");
} catch(e) {
  console.log("Failed string:", e.message);
}
