const { Chess } = require('chess.js');
const c = new Chess();
try {
  c.loadPgn('[FEN "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3"]\n1... a6 2. Ba4');
  console.log("Success:", c.history());
} catch(e) {
  console.log("Error:", e.message);
}
