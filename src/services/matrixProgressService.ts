import { Chess } from 'chess.js';

export interface MasteredNode {
  id: string;
  fen: string;           // Position before the correct move
  correctSan: string;    // Move in SAN format
  from: string;          // Source square e.g. "e2"
  to: string;            // Target square e.g. "e4"
  moveNumber: number;
  playerColor: 'w' | 'b';
  opponentLastMove?: string | null; // e.g. "c5" or "Nf6"
  opponentFrom?: string;
  opponentTo?: string;
  lineTitle?: string;
  method: 'N_PLUS_ONE' | 'ECHO_RECALL';
  timestamp: number;
}

export interface LineHistoryEntry {
  id: string;
  lineIndex: number;
  lineTitle: string;
  movesCount: number;
  score: number;
  method: 'N_PLUS_ONE' | 'ECHO_RECALL';
  date: number;
  userColor: 'w' | 'b';
}

export interface MatrixMasteryData {
  masteredLinesCount: number;       // N+1 Sequential Mastery
  eliteMasteredLinesCount: number;  // 0 to N Echo Recall Elite Mastery
  totalMasteryPoints: number;
  recentScore: number;
  masteredNodes: MasteredNode[];
  lineHistory: LineHistoryEntry[];
}

export interface QuizChallenge {
  node: MasteredNode;
  questionText: string;
  options: string[]; // 4 options in SAN including the correct one
  correctSan: string;
}

const STORAGE_KEY = 'caissa_matrix_mastery_progress';

class MatrixProgressService {
  private data: MatrixMasteryData;

  constructor() {
    this.data = this.loadFromStorage();
  }

  private loadFromStorage(): MatrixMasteryData {
    if (typeof window === 'undefined') {
      return this.getDefaultData();
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          masteredLinesCount: typeof parsed.masteredLinesCount === 'number' ? parsed.masteredLinesCount : 0,
          eliteMasteredLinesCount: typeof parsed.eliteMasteredLinesCount === 'number' ? parsed.eliteMasteredLinesCount : 0,
          totalMasteryPoints: typeof parsed.totalMasteryPoints === 'number' ? parsed.totalMasteryPoints : 0,
          recentScore: typeof parsed.recentScore === 'number' ? parsed.recentScore : 100,
          masteredNodes: Array.isArray(parsed.masteredNodes) ? parsed.masteredNodes : [],
          lineHistory: Array.isArray(parsed.lineHistory) ? parsed.lineHistory : [],
        };
      }
    } catch (e) {
      console.warn('[MatrixProgressService] Failed to load data from storage:', e);
    }
    return this.getDefaultData();
  }

  private getDefaultData(): MatrixMasteryData {
    return {
      masteredLinesCount: 0,
      eliteMasteredLinesCount: 0,
      totalMasteryPoints: 0,
      recentScore: 100,
      masteredNodes: [],
      lineHistory: [],
    };
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[MatrixProgressService] Failed to save data to storage:', e);
    }
  }

  public getData(): MatrixMasteryData {
    return { ...this.data };
  }

  /**
   * Calculate a dynamic mastery score for a line:
   * Base score: 95
   * Fault penalty: -5 per blunder reset (down to min 60)
   * Length bonus: +1 per 3 plies (up to 100)
   * Method multiplier: 1.0 for N+1, 1.1 for 0→N Elite Recall
   */
  public calculateMasteryScore(movesCount: number, faults: number, method: 'N_PLUS_ONE' | 'ECHO_RECALL'): number {
    const base = 95;
    const faultPenalty = faults * 6;
    const lengthBonus = Math.min(5, Math.floor(movesCount / 3));
    const rawScore = Math.max(65, Math.min(100, base - faultPenalty + lengthBonus));
    const multiplier = method === 'ECHO_RECALL' ? 1.05 : 1.0;
    return Math.min(100, Math.round(rawScore * multiplier));
  }

  /**
   * Records a line as mastered, extracts player move positions as Mastered Nodes for quizzes,
   * and saves the progress.
   */
  public recordLineMastered(
    method: 'N_PLUS_ONE' | 'ECHO_RECALL',
    lineMoves: string[],
    lineIndex: number,
    faults: number = 0,
    userColor: 'w' | 'b' = 'w',
    lineTitle?: string
  ): { score: number; isElite: boolean; data: MatrixMasteryData } {
    const score = this.calculateMasteryScore(lineMoves.length, faults, method);
    const isElite = method === 'ECHO_RECALL';

    if (isElite) {
      this.data.eliteMasteredLinesCount += 1;
    } else {
      this.data.masteredLinesCount += 1;
    }

    this.data.totalMasteryPoints += score;
    this.data.recentScore = score;

    // Record line history
    const historyEntry: LineHistoryEntry = {
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      lineIndex,
      lineTitle: lineTitle || `Variation ${lineIndex + 1}`,
      movesCount: lineMoves.length,
      score,
      method,
      date: Date.now(),
      userColor,
    };
    this.data.lineHistory.unshift(historyEntry);
    if (this.data.lineHistory.length > 50) {
      this.data.lineHistory.pop();
    }

    // Extract mastered nodes from this line
    try {
      const chess = new Chess();
      let lastOpponentMove: { san: string; from: string; to: string } | null = null;

      for (let i = 0; i < lineMoves.length; i++) {
        const isPlayerTurn = (i % 2 === 0 && userColor === 'w') || (i % 2 !== 0 && userColor === 'b');
        const fenBefore = chess.fen();
        const san = lineMoves[i];
        const moveRes = chess.move(san);

        if (!moveRes) break;

        if (isPlayerTurn) {
          // Add this node to masteredNodes if not already recorded
          const existingIdx = this.data.masteredNodes.findIndex(n => n.fen === fenBefore);
          const node: MasteredNode = {
            id: `node-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
            fen: fenBefore,
            correctSan: moveRes.san,
            from: moveRes.from,
            to: moveRes.to,
            moveNumber: Math.floor(i / 2) + 1,
            playerColor: userColor,
            opponentLastMove: lastOpponentMove?.san || null,
            opponentFrom: lastOpponentMove?.from,
            opponentTo: lastOpponentMove?.to,
            lineTitle: lineTitle || `Line ${lineIndex + 1}`,
            method,
            timestamp: Date.now(),
          };

          if (existingIdx >= 0) {
            this.data.masteredNodes[existingIdx] = node;
          } else {
            this.data.masteredNodes.push(node);
          }
        } else {
          lastOpponentMove = { san: moveRes.san, from: moveRes.from, to: moveRes.to };
        }
      }

      // Keep up to 100 unique nodes to prevent bloat
      if (this.data.masteredNodes.length > 100) {
        this.data.masteredNodes = this.data.masteredNodes.slice(-100);
      }
    } catch (e) {
      console.warn('[MatrixProgressService] Error extracting nodes from line:', e);
    }

    this.saveToStorage();
    return { score, isElite, data: { ...this.data } };
  }

  /**
   * Generates a random quiz challenge from previously mastered nodes.
   * If no nodes are saved, returns null.
   */
  public getRandomQuizChallenge(): QuizChallenge | null {
    if (!this.data.masteredNodes || this.data.masteredNodes.length === 0) {
      return null;
    }

    // Pick random mastered node
    const randIdx = Math.floor(Math.random() * this.data.masteredNodes.length);
    const node = this.data.masteredNodes[randIdx];

    try {
      const chess = new Chess(node.fen);
      const legalMoves = chess.moves({ verbose: false });

      // Generate realistic dynamic question
      const oppColor = node.playerColor === 'w' ? 'Black' : 'White';
      const userCol = node.playerColor === 'w' ? 'White' : 'Black';

      let questionText = '';
      if (node.opponentLastMove) {
        const questionTemplates = [
          `${oppColor} just did this: "${node.opponentLastMove}". What would you play here?`,
          `${oppColor} just played ${node.opponentLastMove}! What is your mastered response?`,
          `${oppColor} strikes with ${node.opponentLastMove}. Show your repertoire continuation:`,
          `Random Position Recall: ${oppColor} pushed ${node.opponentLastMove}. What's your move here?`,
          `Mastery Checkpoint: Opponent played ${node.opponentLastMove}. How do you respond?`,
        ];
        questionText = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];
      } else {
        const genericTemplates = [
          `Mastered Node Check: What would you play here as ${userCol}?`,
          `Recall Drill: Find the textbook continuation in this mastered position:`,
          `What is your repertoire move here for ${userCol}?`,
          `Random Mastered Position: What would you play here?`,
        ];
        questionText = genericTemplates[Math.floor(Math.random() * genericTemplates.length)];
      }

      // Generate 3 plausible distractor moves
      const distractors = legalMoves.filter(m => m !== node.correctSan);
      // Shuffle distractors
      const shuffledDistractors = [...distractors].sort(() => 0.5 - Math.random());
      const selectedDistractors = shuffledDistractors.slice(0, 3);

      // Combine and shuffle options
      const allOptions = [node.correctSan, ...selectedDistractors].sort(() => 0.5 - Math.random());

      return {
        node,
        questionText,
        options: allOptions,
        correctSan: node.correctSan,
      };
    } catch (e) {
      console.warn('[MatrixProgressService] Error generating quiz:', e);
      return null;
    }
  }
}

export const matrixProgress = new MatrixProgressService();
