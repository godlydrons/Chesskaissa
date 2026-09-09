import { Chess } from 'chess.js';
import { type BlunderNode } from '../types/training';

// This is a simulated shredder for the prototype.
// In a real app, this would use a Web Worker with Stockfish WASM.
export async function shredGame(pgn: string, opponent: string): Promise<BlunderNode[]> {
  const chess = new Chess();
  chess.loadPgn(pgn);
  const history = chess.history({ verbose: true });
  
  // For the prototype, we'll "find" 3 blunders at specific points
  // In reality, we'd iterate through moves and check eval spikes.
  
  const nodes: BlunderNode[] = [
    {
      id: 'blunder-1',
      fen: 'r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5',
      previousFen: 'r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5',
      blunderMove: 'O-O',
      bestMove: 'd3',
      opponent: opponent || 'Stockfish_Level_5',
      eloBled: 12,
      room: 'FORGE',
      userColor: 'w',
      stance: 'POSITIONAL',
      date: new Date().toISOString(),
      isSolved: false,
      fsrsLevel: 0,
      nextReview: new Date().toISOString(),
    },
    {
      id: 'blunder-2',
      fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 4',
      staleFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      movesToBlunder: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6'],
      blunderMove: 'Bc4',
      bestMove: 'Bb5',
      opponent: opponent || 'Grandmaster_X',
      eloBled: 15,
      room: 'BLINDFOLD',
      userColor: 'w',
      date: new Date().toISOString(),
      isSolved: false,
      fsrsLevel: 0,
      nextReview: new Date().toISOString(),
      previousFen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 0 4',
    },
    {
      id: 'blunder-3',
      fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
      previousFen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
      blunderMove: 'e4',
      bestMove: 'Kd2',
      opponent: opponent || 'Blitz_Demon',
      eloBled: 25,
      room: 'CRUCIBLE',
      userColor: 'w',
      date: new Date().toISOString(),
      isSolved: false,
      fsrsLevel: 0,
      nextReview: new Date().toISOString(),
    }
  ];

  return nodes;
}


import { PuzzleService } from './puzzleService';

export async function shredLichessGames(games: any[], username: string): Promise<BlunderNode[]> {
  const allNodes: BlunderNode[] = [];

  console.log(`Shredding ${games.length} games for ${username}`);
  for (const game of games) {
    if (!game.analysis) {
      console.warn(`Game ${game.id} has no analysis, skipping.`);
      continue;
    }

    const chess = new Chess();
    const moves = game.moves ? game.moves.split(' ') : [];
    const userColor = game.players.white.user?.name?.toLowerCase() === username.toLowerCase() ? 'w' : 'b';

    let currentEval = 0; // Centipawns
    
    const fens: string[] = [chess.fen()];
    
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const analysis = game.analysis[i];
      const previousFen = chess.fen();
      
      try {
        chess.move(move);
        fens.push(chess.fen());
      } catch (e) {
        break;
      }

      if (!analysis) continue;

      const newEval = analysis.eval !== undefined ? analysis.eval : (analysis.mate ? (analysis.mate > 0 ? 10000 : -10000) : currentEval);
      const turn = i % 2 === 0 ? 'w' : 'b';

      // Check for Delta Spike
      const delta = turn === 'w' ? (newEval - currentEval) : (currentEval - newEval);
      
      if (turn === userColor && delta < -150) {
        const room: 'FORGE' | 'BLINDFOLD' | 'CRUCIBLE' = 
          Math.abs(delta) > 300 ? 'CRUCIBLE' : 
          i < 20 ? 'FORGE' : 'BLINDFOLD';

        const staleIndex = Math.max(0, i - 6);
        const movesToBlunder = moves.slice(staleIndex, i + 1);

        allNodes.push({
          id: `lichess-${game.id}-${i}`,
          fen: chess.fen(),
          previousFen: previousFen,
          staleFen: fens[staleIndex],
          movesToBlunder: movesToBlunder,
          blunderMove: move,
          bestMove: analysis.best || '?',
          opponent: userColor === 'w' ? game.players.black.user?.name : game.players.white.user?.name,
          eloBled: Math.floor(Math.abs(delta) / 10),
          room,
          userColor,
          date: game.createdAt || new Date().toISOString(),
          isSolved: false,
          fsrsLevel: 0,
          nextReview: new Date().toISOString(),
        });
      }
      currentEval = newEval;
    }
  }

  if (allNodes.length === 0) {
    console.log('No blunders found in Lichess games, falling back to high-rated puzzles.');
    return await PuzzleService.getFallbackPuzzles();
  }

  return allNodes;
}
