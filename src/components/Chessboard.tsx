import React, { useState, useEffect, useMemo } from 'react';
import { Chess, Square as ChessSquare } from 'chess.js';
import { motion, AnimatePresence } from 'motion/react';
import { PIECE_IMAGES, SQUARES, type Square } from './constants';
import { cn } from '../lib/utils';

interface ChessboardProps {
  position: string;
  interactionPosition?: string;
  onMove: (from: string, to: string) => void;
  turn: 'w' | 'b';
  ghostSquare?: string | null;
  ghostPiece?: { square: string; type: string; color: string } | null;
  orientation?: 'w' | 'b';
  boardOrientation?: 'white' | 'black';
  isBlindMode?: boolean;
  highlightSquares?: string[];
  opponentLastMove?: { from: string; to: string; san?: string } | null;
  premoves?: Array<{ from: string; to: string }>;
  onCancelPremoves?: () => void;
  allowPremoves?: boolean;
}

export const Chessboard: React.FC<ChessboardProps> = ({ 
  position, 
  interactionPosition,
  onMove, 
  turn, 
  ghostSquare,
  ghostPiece,
  orientation = 'w',
  boardOrientation,
  isBlindMode = false,
  highlightSquares = [],
  opponentLastMove = null,
  premoves = [],
  onCancelPremoves,
  allowPremoves = true
}) => {
  // INTERNAL_CHESS_ENGINE: Maintain state in sync with props
  const [boardMap, setBoardMap] = useState<Record<string, { type: string; color: string }>>({});
  const [interactionMap, setInteractionMap] = useState<Record<string, { type: string; color: string }>>({});
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);

  // REACTIVE_FORCE_SYNC: Syncs board maps to FEN props
  useEffect(() => {
    const parseFen = (fenString: string) => {
      try {
        const targetFen = fenString === 'start' || !fenString 
          ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' 
          : fenString.trim();
        const internalChess = new Chess(targetFen);
        const newMap: Record<string, { type: string; color: string }> = {};
        const board = internalChess.board();
        const colLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

        board.forEach((row, rIdx) => {
          row.forEach((cell, cIdx) => {
            if (cell) {
              const square = `${colLabels[cIdx]}${8 - rIdx}`;
              newMap[square] = { type: cell.type, color: cell.color };
            }
          });
        });
        return newMap;
      } catch (e) {
        return {};
      }
    };

    setBoardMap(parseFen(position));
    if (interactionPosition) {
      setInteractionMap(parseFen(interactionPosition));
    } else {
      setInteractionMap({});
    }
    
    setSelectedSquare(null);
  }, [position, interactionPosition]);

  const resolvedOrientation = boardOrientation
    ? (boardOrientation === 'white' ? 'w' : 'b')
    : orientation;

  const displayedSquares = resolvedOrientation === 'w' ? SQUARES : [...SQUARES].reverse();
  const boardRef = React.useRef<HTMLDivElement>(null);
  const [draggingSquare, setDraggingSquare] = useState<Square | null>(null);

  // Convert square (e.g. 'e4') to (col, row) coordinates based on current board perspective
  const squareToCoords = (sq: string) => {
    if (!sq || sq.length < 2) return null;
    const file = sq.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(sq[1], 10) - 1;
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    const col = resolvedOrientation === 'w' ? file : 7 - file;
    const row = resolvedOrientation === 'w' ? 7 - rank : rank;
    return { col, row };
  };

  // Calculate legal moves for currently selected piece (for smooth click-to-move guidance)
  const legalMoves = useMemo(() => {
    if (!selectedSquare) return [];
    try {
      const fen = position === 'start' || !position ? undefined : position.trim();
      const c = new Chess(fen);
      return c.moves({ square: selectedSquare as ChessSquare, verbose: true }).map(m => m.to);
    } catch {
      return [];
    }
  }, [selectedSquare, position]);

  const handleSquareClick = (square: Square) => {
    const currentPieceMap = interactionPosition ? interactionMap : boardMap;
    const pieceOnSquare = currentPieceMap[square];
    const selectedPiece = selectedSquare ? currentPieceMap[selectedSquare] : null;

    if (selectedSquare) {
      if (square === selectedSquare) {
        // Deselect
        setSelectedSquare(null);
        return;
      }

      // If user clicked another piece of their own army, switch selection smoothly
      if (pieceOnSquare && selectedPiece && pieceOnSquare.color === selectedPiece.color) {
        setSelectedSquare(square);
        return;
      }

      // Execute move or queue premove (works for empty squares AND opponent captures!)
      onMove(selectedSquare, square);
      setSelectedSquare(null);
      return;
    }

    // No piece selected: can we select piece on this square?
    // User can select if it's their color or current active turn
    const canControl = pieceOnSquare && (
      pieceOnSquare.color === turn || 
      (allowPremoves && pieceOnSquare.color === resolvedOrientation)
    );

    if (canControl) {
      setSelectedSquare(square);
    }
  };

  const handleDragStart = (square: Square) => {
    setDraggingSquare(square);
    setSelectedSquare(square);
  };

  const handleDragEnd = (event: any, info: any, fromSquare: Square) => {
    setDraggingSquare(null);
    if (!boardRef.current) return;
    
    const boardRect = boardRef.current.getBoundingClientRect();
    
    // Support pointer, mouse, and touch coordinates robustly
    const clientX = event?.clientX ?? event?.changedTouches?.[0]?.clientX ?? info?.point?.x;
    const clientY = event?.clientY ?? event?.changedTouches?.[0]?.clientY ?? info?.point?.y;

    if (clientX !== undefined && clientY !== undefined) {
      const x = clientX - boardRect.left;
      const y = clientY - boardRect.top;
      
      const colSize = boardRect.width / 8;
      const rowSize = boardRect.height / 8;
      
      const col = Math.floor(x / colSize);
      const row = Math.floor(y / rowSize);
      
      if (col >= 0 && col < 8 && row >= 0 && row < 8) {
        const targetSquare = displayedSquares[row * 8 + col] as Square;
        if (targetSquare !== fromSquare) {
          onMove(fromSquare, targetSquare);
        }
      }
    }
    
    setSelectedSquare(null);
  };

  return (
    <div 
      ref={boardRef}
      onContextMenu={(e) => {
        e.preventDefault();
        if (onCancelPremoves) onCancelPremoves();
        setSelectedSquare(null);
      }}
      className="relative w-full h-full bg-slate-900 overflow-hidden shadow-2xl rounded-sm border border-white/5 select-none touch-none"
    >
      {/* Premove SVG Visual Arrows Layer */}
      {premoves.length > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible">
          <defs>
            <marker id="premove-arrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="#60a5fa" />
            </marker>
          </defs>
          {premoves.map((p, idx) => {
            const fromCoord = squareToCoords(p.from);
            const toCoord = squareToCoords(p.to);
            if (!fromCoord || !toCoord) return null;
            return (
              <line
                key={`p-arrow-${p.from}-${p.to}-${idx}`}
                x1={`${(fromCoord.col + 0.5) * 12.5}%`}
                y1={`${(fromCoord.row + 0.5) * 12.5}%`}
                x2={`${(toCoord.col + 0.5) * 12.5}%`}
                y2={`${(toCoord.row + 0.5) * 12.5}%`}
                stroke="#60a5fa"
                strokeWidth="3.5"
                strokeLinecap="round"
                markerEnd="url(#premove-arrow)"
                className="drop-shadow-[0_0_8px_rgba(96,165,250,0.85)] opacity-90"
              />
            );
          })}
        </svg>
      )}

      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {displayedSquares.map((square, index) => {
          const row = Math.floor(index / 8);
          const col = index % 8;
          const isLight = (row + col) % 2 === 0;
          const piece = boardMap[square];
          const interactivePiece = interactionPosition ? interactionMap[square] : piece;
          
          const isSelected = selectedSquare === square;
          const isGhost = ghostSquare === square;
          const isHighlighted = highlightSquares.includes(square);
          const isLegalTarget = legalMoves.includes(square);

          // Opponent Last Move Emphasis
          const isOpponentFrom = opponentLastMove?.from === square;
          const isOpponentTo = opponentLastMove?.to === square;

          // Premove Indicators
          const isPremoveFrom = premoves.some(p => p.from === square);
          const premoveToIndex = premoves.findIndex(p => p.to === square);
          const isPmoveTo = premoveToIndex !== -1;

          // Interactive control authorization
          const canControlPiece = interactivePiece && (
            interactivePiece.color === turn || 
            (allowPremoves && interactivePiece.color === resolvedOrientation)
          );

          return (
            <div
              key={square}
              onClick={() => handleSquareClick(square as Square)}
              className={cn(
                "relative flex items-center justify-center cursor-pointer transition-colors duration-200 select-none",
                isLight ? "bg-[#334155]" : "bg-[#1e293b]",
                isSelected && "bg-cyan-500/30 ring-2 ring-inset ring-cyan-400 z-10",
                
                // USER DIRECTIVE: Match glow opacity between Opponent glow and N+1 own glow
                isGhost && "bg-cyan-500/28 ring-2 ring-inset ring-cyan-400/80 shadow-[inset_0_0_15px_rgba(6,182,212,0.28)] animate-pulse z-20",
                
                isHighlighted && "bg-yellow-500/30 ring-2 ring-inset ring-yellow-400 z-10",
                
                // Opponent move emphasis styling (matched opacity with N+1 glow)
                isOpponentFrom && !isSelected && "bg-amber-500/20 ring-2 ring-inset ring-amber-400/40 z-10",
                isOpponentTo && !isSelected && "bg-amber-500/28 ring-2 ring-inset ring-amber-400/80 shadow-[inset_0_0_15px_rgba(245,158,11,0.28)] z-20",

                // Premove visual styling (matched opacity)
                isPremoveFrom && !isSelected && "bg-blue-600/20 ring-1 ring-inset ring-blue-400/50 z-10",
                isPmoveTo && !isSelected && "bg-blue-500/28 ring-2 ring-inset ring-blue-400/80 shadow-[inset_0_0_15px_rgba(59,130,246,0.28)] z-20",

                !isSelected && !isGhost && !isHighlighted && !isOpponentTo && !isPmoveTo && canControlPiece && "hover:bg-white/10"
              )}
            >
              {/* Opponent Destination indicator badge */}
              {isOpponentTo && (
                <div className="absolute top-1 left-1 z-30 pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-amber-400 block shadow-[0_0_6px_#f59e0b] animate-ping" />
                </div>
              )}

              {/* Premove Badge */}
              {isPmoveTo && (
                <div className="absolute top-1 right-1 z-30 pointer-events-none px-1.5 py-0.5 rounded bg-blue-600/90 text-[8px] font-mono font-bold text-white shadow-md border border-blue-400/50 animate-fadeIn">
                  P{premoveToIndex + 1}
                </div>
              )}

              {/* Legal Move Indicators (dots for empty squares, ring for captures) */}
              {isLegalTarget && !isGhost && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  {piece ? (
                    <div className="w-[88%] h-[88%] rounded-full border-2 border-cyan-400/80 bg-cyan-400/10" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full bg-cyan-400/50 shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
                  )}
                </div>
              )}

              {/* Single piece rendering per square - zero duplicates, buttery smooth physics */}
              <AnimatePresence>
                {interactivePiece && (
                  <motion.img
                    key={`piece-${square}-${interactivePiece.color}${interactivePiece.type}`}
                    initial={false}
                    animate={{ 
                      scale: 1, 
                      opacity: isBlindMode ? 0 : (draggingSquare === square ? 0 : 1),
                    }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                    draggable={false}
                    drag={Boolean(canControlPiece)}
                    dragConstraints={boardRef}
                    dragElastic={0.02}
                    dragMomentum={false}
                    onDragStart={() => handleDragStart(square as Square)}
                    onDragEnd={(e, info) => handleDragEnd(e, info, square as Square)}
                    whileDrag={{ 
                      scale: 1.15, 
                      zIndex: 100, 
                      opacity: 1, 
                      filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.65))" 
                    }}
                    src={PIECE_IMAGES[`${interactivePiece.color}${interactivePiece.type.toUpperCase()}`]}
                    alt={`${interactivePiece.color} ${interactivePiece.type}`}
                    className={cn(
                      "absolute inset-0 m-auto w-[85%] h-[85%] select-none touch-none",
                      canControlPiece ? "cursor-grab active:cursor-grabbing z-20" : "pointer-events-none z-10",
                      interactionPosition && "opacity-40 grayscale"
                    )}
                    referrerPolicy="no-referrer"
                  />
                )}

                {/* Ghost Piece (Phantom Silhouette) */}
                {ghostPiece && ghostPiece.square === square && (
                  <motion.img
                    key={`ghost-${ghostPiece.color}${ghostPiece.type}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.25, scale: 1 }}
                    exit={{ opacity: 0 }}
                    draggable={false}
                    src={PIECE_IMAGES[`${ghostPiece.color}${ghostPiece.type.toUpperCase()}`]}
                    className="absolute inset-0 m-auto w-[80%] h-[80%] select-none z-30 pointer-events-none invert hue-rotate-[200deg] brightness-200 blur-[1px]"
                    referrerPolicy="no-referrer"
                  />
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
