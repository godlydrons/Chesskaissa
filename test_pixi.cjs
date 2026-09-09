const PIXI = require('pixi.js');
console.log(Object.keys(PIXI.Graphics.prototype).filter(k => k.toLowerCase().includes('fill')));
