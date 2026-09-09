const PIXI = require('pixi.js');
async function run() {
  const app = new PIXI.Application();
  await app.init();
  console.log("Keys:", Object.keys(app));
  console.log("Has canvas:", !!app.canvas);
  console.log("Has view:", !!app.view);
}
run().catch(console.error);
