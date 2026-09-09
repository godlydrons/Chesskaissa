export type RoomType = 'FORGE' | 'BLINDFOLD' | 'CRUCIBLE';

export interface BlunderNode {
  id: string;
  fen: string;
  previousFen: string; // One ply before blunder
  staleFen?: string; // 5-8 moves before blunder for Blindfold
  movesToBlunder?: string[]; // Sequence of moves for Blindfold
  userColor: 'w' | 'b';
  blunderMove: string; // The move the user actually made
  bestMove: string; // The move the user missed
  opponent: string;
  eloBled: number;
  room: RoomType;
  stance?: 'TACTICAL' | 'POSITIONAL';
  date: string;
  isSolved: boolean;
  fsrsLevel: number; // 0 to 5
  nextReview: string;
}

export interface ShredderResult {
  nodes: BlunderNode[];
  totalEloBled: number;
}
