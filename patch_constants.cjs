const fs = require('fs');
let content = fs.readFileSync('src/components/constants.ts', 'utf8');

const regex = /export const PIECE_IMAGES: Record<string, string> = \{[\s\S]*?\};/m;
const newImages = `export const PIECE_IMAGES: Record<string, string> = {
  wP: "https://lichess1.org/assets/piece/cburnett/wP.svg",
  wN: "https://lichess1.org/assets/piece/cburnett/wN.svg",
  wB: "https://lichess1.org/assets/piece/cburnett/wB.svg",
  wR: "https://lichess1.org/assets/piece/cburnett/wR.svg",
  wQ: "https://lichess1.org/assets/piece/cburnett/wQ.svg",
  wK: "https://lichess1.org/assets/piece/cburnett/wK.svg",
  bP: "https://lichess1.org/assets/piece/cburnett/bP.svg",
  bN: "https://lichess1.org/assets/piece/cburnett/bN.svg",
  bB: "https://lichess1.org/assets/piece/cburnett/bB.svg",
  bR: "https://lichess1.org/assets/piece/cburnett/bR.svg",
  bQ: "https://lichess1.org/assets/piece/cburnett/bQ.svg",
  bK: "https://lichess1.org/assets/piece/cburnett/bK.svg",
};`;

content = content.replace(regex, newImages);
fs.writeFileSync('src/components/constants.ts', content);
console.log("Patched constants.ts");
