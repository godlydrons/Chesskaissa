import { Chess } from 'chess.js';
import { NeuralMatrix } from '../types/MatrixDatabase';

export interface DagNode {
  fen: string;
  san?: string;
  children: Map<string, DagNode>;
}

/**
 * CAISSA-CORE: PGN TO NEURAL MATRIX PARSER
 * Converts a PGN string into a Prefix Tree (Matrix) format for the Auto-Router.
 */
export async function parsePgnToMatrix(pgn: string): Promise<NeuralMatrix> {
  const matrix: NeuralMatrix = {};
  const chess = new Chess();
  
  try {
    // Attempt to load the PGN
    // If it's a multi-game PGN, we handle the first game for the Matrix
    // or we can aggregate if needed. For now, we focus on the selected game.
    chess.loadPgn(pgn);
    
    const history = chess.history({ verbose: true });
    const tempGame = new Chess();
    
    // Initial state
    let currentFen = tempGame.fen();
    if (!matrix[currentFen]) {
      matrix[currentFen] = { moves: {}, provinces: ['MAINLINE'] };
    }

    // Traverse the game history to build the matrix
    for (const move of history) {
      const san = move.san;
      const prevFen = currentFen;
      
      tempGame.move(move);
      currentFen = tempGame.fen();

      // Add move to the previous FEN's node
      if (!matrix[prevFen]) {
        matrix[prevFen] = { moves: {}, provinces: [] };
      }
      matrix[prevFen].moves[san] = currentFen;

      // Ensure the target FEN exists in the matrix
      if (!matrix[currentFen]) {
        matrix[currentFen] = { moves: {}, provinces: ['MAINLINE'] };
      }
    }

    return matrix;
  } catch (e) {
    console.error("Matrix Ingestion Failure:", e);
    return {};
  }
}
