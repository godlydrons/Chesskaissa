/**
 * CAISSA-CORE: LICHESS PUZZLE INTEGRATOR
 * Fetches tactical data blocks from the Lichess Open API.
 */
export interface LichessPuzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
}

export class PuzzleService {
  /**
   * Fetches the daily puzzle from Lichess.
   */
  async getDailyPuzzle(): Promise<LichessPuzzle | null> {
    try {
      const response = await fetch('https://lichess.org/api/puzzle/daily');
      if (!response.ok) throw new Error('Failed to fetch daily puzzle');
      const data = await response.json();
      
      // Support both old 'lines' field and standard modern 'solution' array from Lichess
      let puzzleMoves: string[] = [];
      if (data && data.puzzle) {
        if (Array.isArray(data.puzzle.solution)) {
          puzzleMoves = data.puzzle.solution;
        } else if (typeof data.puzzle.lines === 'string') {
          puzzleMoves = data.puzzle.lines.split(' ');
        } else if (Array.isArray(data.puzzle.lines)) {
          puzzleMoves = data.puzzle.lines;
        } else if (typeof data.puzzle.solution === 'string') {
          puzzleMoves = (data.puzzle.solution as string).split(' ');
        }
      }

      return {
        id: data?.puzzle?.id || 'daily-fallback',
        fen: data?.game?.fen || 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        moves: puzzleMoves.length > 0 ? puzzleMoves : ['d4'],
        rating: data?.puzzle?.rating || 1500,
        themes: data?.puzzle?.themes || []
      };
    } catch (e) {
      console.warn('PuzzleService Error:', e);
      return null;
    }
  }

  /**
   * Static method for backward compatibility with shredderService
   */
  static async getFallbackPuzzles(): Promise<any[]> {
    return [
      {
        id: 'fallback-1',
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        blunderMove: 'd4',
        bestMove: 'Bb5',
        opponent: 'Grandmaster_X',
        eloBled: 20,
        room: 'CRUCIBLE',
        userColor: 'w',
        date: new Date().toISOString(),
        isSolved: false,
        fsrsLevel: 0,
        nextReview: new Date().toISOString(),
      }
    ];
  }

  /**
   * Generates a batch of puzzles.
   */
  async getTacticalBatch(count: number = 5): Promise<LichessPuzzle[]> {
    const daily = await this.getDailyPuzzle();
    if (daily) return [daily];
    
    return [
      {
        id: 'static-1',
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        moves: ['d4', 'exd4', 'Nxd4'],
        rating: 1200,
        themes: ['opening']
      }
    ];
  }
}

export const puzzleService = new PuzzleService();
