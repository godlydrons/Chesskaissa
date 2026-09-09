const { Chess } = require('chess.js');
const c = new Chess();
try {
  c.loadPgn("1. 1. e4");
  console.log("Success:", c.history());
} catch(e) {
  console.log("Error:", e.message);
}
