export const PIECE_IMAGES: Record<string, string> = {
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
};

export const SQUARES = [
  "a8", "b8", "c8", "d8", "e8", "f8", "g8", "h8",
  "a7", "b7", "c7", "d7", "e7", "f7", "g7", "h7",
  "a6", "b6", "c6", "d6", "e6", "f6", "g6", "h6",
  "a5", "b5", "c5", "d5", "e5", "f5", "g5", "h5",
  "a4", "b4", "c4", "d4", "e4", "f4", "g4", "h4",
  "a3", "b3", "c3", "d3", "e3", "f3", "g3", "h3",
  "a2", "b2", "c2", "d2", "e2", "f2", "g2", "h2",
  "a1", "b1", "c1", "d1", "e1", "f1", "g1", "h1",
] as const;

export type Square = (typeof SQUARES)[number];
