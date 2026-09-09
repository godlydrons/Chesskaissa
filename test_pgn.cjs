const { Chess } = require('chess.js');
const c = new Chess();
c.loadPgn("1. e4 e5 2. Nf3");
console.log(c.history());
