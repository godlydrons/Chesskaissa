import { useState, useCallback, useMemo } from 'react';
import { Chess, type Move } from 'chess.js';

export function useChess() {
  const [game, setGame] = useState(new Chess());
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);

  const makeMove = useCallback((move: string | { from: string; to: string; promotion?: string }) => {
    try {
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move(move);
      
      if (result) {
        setGame(gameCopy);
        setMoveHistory(prev => [...prev, result]);
        return result;
      }
    } catch (e) {
      return null;
    }
    return null;
  }, [game]);

  const resetGame = useCallback(() => {
    const newGame = new Chess();
    setGame(newGame);
    setMoveHistory([]);
  }, []);

  const undoMove = useCallback(() => {
    const gameCopy = new Chess(game.fen());
    gameCopy.undo();
    setGame(gameCopy);
    setMoveHistory(prev => prev.slice(0, -1));
  }, [game]);

  const board = useMemo(() => game.board(), [game]);
  const turn = game.turn();
  const isCheck = game.inCheck();
  const isCheckmate = game.isCheckmate();
  const isDraw = game.isDraw();
  const isGameOver = game.isGameOver();
  const fen = game.fen();

  return {
    game,
    board,
    turn,
    isCheck,
    isCheckmate,
    isDraw,
    isGameOver,
    fen,
    makeMove,
    resetGame,
    undoMove,
    moveHistory,
  };
}
