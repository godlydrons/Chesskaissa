const { Chess } = require('chess.js');
const c = new Chess();
try {
  c.loadPgn("1. e4 e5 2. Nf3");
  console.log("Success:", c.history());
} catch(e) {
  console.log("Error:", e.message);
}
