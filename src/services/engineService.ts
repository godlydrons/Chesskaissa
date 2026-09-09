import { Chess } from 'chess.js';

export interface EngineEval {
  score: number; // centipawns
  type: 'cp' | 'mate';
  depth: number;
  bestMove?: string;
}

export class StockfishEngine {
  private worker: Worker | null = null;
  private onEvalCallback: ((evaluation: EngineEval) => void) | null = null;
  private onMoveCallback: ((move: string) => void) | null = null;
  private isReady = false;
  private useFallback = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      // Load local stockfish worker running on same origin, avoiding CORS issues entirely
      const stockfishUrl = '/stockfish.js';
      this.worker = new Worker(stockfishUrl);
      
      this.worker.onerror = (e) => {
        console.warn('STOCKFISH_WORKER_ERROR: Attempting CDN fallback...', e);
        try {
          this.worker?.terminate();
          this.worker = new Worker('https://unpkg.com/stockfish.js/stockfish.js');
          this.setupWorkerCallbacks();
          this.send('uci');
        } catch (err) {
          console.warn('STOCKFISH_WORKER_ERROR: Engaging local engine fallback', err);
          this.useFallback = true;
        }
      };

      this.setupWorkerCallbacks();
      this.send('uci');
    } catch (err) {
      console.warn('ENGINE_INIT_ERROR: Trying CDN fallback...', err);
      try {
        this.worker = new Worker('https://unpkg.com/stockfish.js/stockfish.js');
        this.setupWorkerCallbacks();
        this.send('uci');
      } catch (err2) {
        console.warn('ENGINE_INIT_ERROR: Engaging local engine fallback', err2);
        this.useFallback = true;
      }
    }
  }

  private setupWorkerCallbacks() {
    if (!this.worker) return;
    this.worker.onmessage = (e) => {
      const line = e.data;
      if (typeof line !== 'string') return;
      
      console.debug('ENGINE_RAW:', line);

      if (line === 'uciok') {
        this.isReady = true;
        this.send('isready');
        this.send('setoption name Skill Level value 20');
      }

      if (line.startsWith('info depth')) {
        this.parseEval(line);
      }

      if (line.startsWith('bestmove')) {
        const move = line.split(' ')[1];
        if (this.onMoveCallback) this.onMoveCallback(move);
      }
    };
  }

  private send(cmd: string) {
    if (this.worker && !this.useFallback) {
      try {
        this.worker.postMessage(cmd);
      } catch (e) {
        this.useFallback = true;
      }
    }
  }

  private parseEval(line: string) {
    // Example: info depth 10 seldepth 14 multipv 1 score cp 328 nodes 15822 nps 753428 hashfull 12 tbhits 0 time 21 pv e2e4
    const depthMatch = line.match(/depth (\d+)/);
    const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
    const pvMatch = line.match(/pv (\w+)/);

    if (scoreMatch && this.onEvalCallback) {
      this.onEvalCallback({
        type: scoreMatch[1] as 'cp' | 'mate',
        score: parseInt(scoreMatch[2], 10),
        depth: depthMatch ? parseInt(depthMatch[1], 10) : 0,
        bestMove: pvMatch ? pvMatch[1] : undefined
      });
    }
  }

  setEvaluationListener(cb: (evaluation: EngineEval) => void) {
    this.onEvalCallback = cb;
  }

  setMoveListener(cb: (move: string) => void) {
    this.onMoveCallback = cb;
  }

  evaluate(fen: string, depth = 15) {
    if (this.useFallback) {
      setTimeout(() => this.runLocalEval(fen), 30);
      return;
    }
    this.send(`position fen ${fen}`);
    this.send(`go depth ${depth}`);
  }

  getBestMove(fen: string, depth = 18) {
    if (this.useFallback) {
      setTimeout(() => this.runLocalBestMove(fen), 50);
      return;
    }
    this.send(`position fen ${fen}`);
    this.send(`go depth ${depth}`);
  }

  private runLocalEval(fen: string) {
    try {
      const chess = new Chess(fen);
      const score = this.evaluateLocalBoard(chess);
      if (this.onEvalCallback) {
        this.onEvalCallback({
          score: score,
          type: 'cp',
          depth: 12
        });
      }
    } catch (e) {
      console.error('Local eval fail:', e);
    }
  }

  private runLocalBestMove(fen: string) {
    try {
      const chess = new Chess(fen);
      const turn = chess.turn();
      const result = this.minimax(chess, 2, turn === 'w');
      
      if (this.onEvalCallback) {
        this.onEvalCallback({
          score: result.score,
          type: 'cp',
          depth: 12,
          bestMove: result.move || undefined
        });
      }

      if (this.onMoveCallback && result.move) {
        this.onMoveCallback(result.move);
      }
    } catch (e) {
      console.error('Local best move fail:', e);
      try {
        const chess = new Chess(fen);
        const moves = chess.moves({ verbose: true });
        if (moves.length > 0 && this.onMoveCallback) {
          const move = moves[0];
          const uci = move.from + move.to + (move.promotion || '');
          this.onMoveCallback(uci);
        }
      } catch (ee) {}
    }
  }

  private evaluateLocalBoard(chess: Chess): number {
    let score = 0;
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          let val = 0;
          switch (piece.type) {
            case 'p': val = 100; break;
            case 'n': val = 320; break;
            case 'b': val = 330; break;
            case 'r': val = 500; break;
            case 'q': val = 900; break;
            case 'k': val = 20000; break;
          }
          
          let positionBonus = 0;
          if (piece.type === 'p') {
            positionBonus = piece.color === 'w' ? (7 - r) * 15 : r * 15;
          } else if (piece.type === 'k') {
            const distFromCenter = Math.abs(3.5 - r) + Math.abs(3.5 - c);
            positionBonus = (6 - distFromCenter) * 10;
          }

          const combined = val + positionBonus;
          if (piece.color === 'w') {
            score += combined;
          } else {
            score -= combined;
          }
        }
      }
    }
    return score;
  }

  private minimax(chess: Chess, depth: number, isMaximizing: boolean): { score: number; move: string | null } {
    if (depth === 0 || chess.isGameOver()) {
      return { score: this.evaluateLocalBoard(chess), move: null };
    }

    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) {
      return { score: this.evaluateLocalBoard(chess), move: null };
    }

    let bestMove: string | null = null;
    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const m of moves) {
        chess.move(m);
        const { score } = this.minimax(chess, depth - 1, false);
        chess.undo();
        if (score > maxScore) {
          maxScore = score;
          bestMove = m.from + m.to + (m.promotion || '');
        }
      }
      return { score: maxScore, move: bestMove };
    } else {
      let minScore = Infinity;
      for (const m of moves) {
        chess.move(m);
        const { score } = this.minimax(chess, depth - 1, true);
        chess.undo();
        if (score < minScore) {
          minScore = score;
          bestMove = m.from + m.to + (m.promotion || '');
        }
      }
      return { score: minScore, move: bestMove };
    }
  }

  stop() {
    this.send('stop');
  }

  terminate() {
    if (this.worker) this.worker.terminate();
    this.isReady = false;
  }
}
