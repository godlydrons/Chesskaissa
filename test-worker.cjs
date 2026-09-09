const { Worker } = require('worker_threads');
const worker = new Worker('./public/stockfish.js');
worker.on('message', (msg) => console.log('MSG:', msg));
worker.postMessage('uci');
setTimeout(() => worker.terminate(), 2000);
