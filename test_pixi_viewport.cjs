const { JSDOM } = require("jsdom");
const dom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

const PIXI = require('pixi.js');
const { Viewport } = require('pixi-viewport');

async function run() {
  const app = new PIXI.Application();
  await app.init({ width: 100, height: 100 });
  console.log("App created");
  try {
    const vp = new Viewport({
      screenWidth: 100,
      screenHeight: 100,
      events: app.renderer.events
    });
    console.log("Viewport created");
  } catch (err) {
    console.error("Viewport Error:", err);
  }
}
run();
