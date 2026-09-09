import { Chess } from 'chess.js';
import { StyleMoment, StyleAlternative, MoveAnnotation, ChampionId } from '../types/champion';

/**
 * CAISSA STYLE EXTRACTOR
 * Automatically identifies critical style moments and generates
 * pedagogical annotations from RAW PGNs without requiring manual text.
 */

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0
};

interface ExtractedMomentDraft {
  ply: number;
  moveNumber: number;
  turn: 'w' | 'b';
  san: string;
  from: string;
  to: string;
  fenBefore: string;
  scoreWeight: number;
  theme: string;
}

export function autoExtractStyleMoments(pgn: string, championId: ChampionId = 'kasparov'): {
  styleMoments: StyleMoment[];
  annotations: Record<number, MoveAnnotation>;
} {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch (e) {
    console.error('Invalid PGN for style extraction', e);
    return { styleMoments: [], annotations: {} };
  }

  const moves = chess.history({ verbose: true });
  const tracker = new Chess();
  const candidateMoments: ExtractedMomentDraft[] = [];
  const annotations: Record<number, MoveAnnotation> = {};

  moves.forEach((m, idx) => {
    const ply = idx + 1;
    const moveNumber = Math.floor(idx / 2) + 1;
    const turn = tracker.turn();
    const fenBefore = tracker.fen();

    const movingPiece = tracker.get(m.from as any);
    const capturedPiece = tracker.get(m.to as any);
    const movingVal = movingPiece ? PIECE_VALUES[movingPiece.type] : 0;
    const capturedVal = capturedPiece ? PIECE_VALUES[capturedPiece.type] : 0;

    // Apply move to tracker
    tracker.move({ from: m.from, to: m.to, promotion: m.promotion });
    const fenAfter = tracker.fen();

    let weight = 0;
    let theme = 'Dynamic Activity';
    let headline = 'FORCEFUL MANEUVER';
    let commentary = `${m.san} maintains dynamic tension and expands piece control.`;
    let styleTip = 'Control the key squares before committing to irreversible pawn moves.';

    // 1. Check for Sacrifices (giving higher value for lower value or free piece)
    if (m.captured && movingVal > capturedVal) {
      weight += 40;
      theme = 'Tactical Sacrifice';
      headline = 'THE SACRIFICIAL BREAKTHROUGH';
      commentary = `Surrendering material to blow open files against the opponent's defenses. In ${championId.toUpperCase()}'s style, tempo and line clearance supersede raw material count.`;
      styleTip = 'Never hesitate to sacrifice an exchange when it exposes the opponent king to fatal crossfire.';
    }

    // 2. Check for Queen or Major Piece Infiltration
    if (m.san.includes('+') || m.san.includes('#')) {
      weight += 25;
      theme = 'King Hunt & Checking Pressure';
      headline = 'MONARCH UNDER SIEGE';
      commentary = `Directly attacking the enemy king. Checks that force defensive concessions are the bedrock of energetic play.`;
      styleTip = 'Force the enemy king into the open where it suffocates its own defensive pieces.';
    }

    // 3. Central pawn breaks (d4, d5, e4, e5, c4, c5, f4, f5)
    if (movingPiece?.type === 'p' && (m.to[1] === '4' || m.to[1] === '5')) {
      weight += 20;
      theme = 'Central Pawn Detonation';
      headline = 'CENTRAL COUNTER-STRIKE';
      commentary = `Ripping open the center to unlock piece mobility. An uncastled or passive opponent cannot withstand open central diagonals.`;
      styleTip = 'A strike in the center is the best refutation to flank pressure.';
    }

    // 4. Outpost Knights on 3rd/6th ranks
    if (movingPiece?.type === 'n' && (m.to[1] === '3' || m.to[1] === '6' || m.to[1] === '4' || m.to[1] === '5')) {
      weight += 30;
      theme = 'Dominant Outpost Anchor';
      headline = 'OCTOPUS OUTPOST';
      commentary = `Planting a knight deep in enemy territory cuts the opponent's pieces in half and paralyzes communication between their wings.`;
      styleTip = 'An anchored knight on the 6th rank is worth more than a static rook.';
    }

    // 5. PGN exclamation marks
    if (m.san.includes('!') || m.san.includes('?')) {
      weight += 35;
      theme = 'Decisive Tactical Turning Point';
      headline = 'MASTERCLASS REFUTATION';
    }

    // Save annotation for this move
    annotations[ply] = {
      ply,
      san: m.san,
      fen: fenAfter,
      headline,
      commentary,
      styleTip,
      arrows: [[m.from, m.to, '#D4AF37']]
    };

    if (weight >= 25 && ply > 6) {
      candidateMoments.push({
        ply,
        moveNumber,
        turn,
        san: m.san,
        from: m.from,
        to: m.to,
        fenBefore,
        scoreWeight: weight,
        theme
      });
    }
  });

  // Sort candidates by weight and pick the top 3-5 distinct moments separated by at least 4 plies
  candidateMoments.sort((a, b) => b.scoreWeight - a.scoreWeight);
  const selectedCandidates: ExtractedMomentDraft[] = [];

  for (const cand of candidateMoments) {
    if (selectedCandidates.length >= 4) break;
    const tooClose = selectedCandidates.some(s => Math.abs(s.ply - cand.ply) < 4);
    if (!tooClose) {
      selectedCandidates.push(cand);
    }
  }

  // Sort chronologically
  selectedCandidates.sort((a, b) => a.ply - b.ply);

  // Generate Style Moments with alternatives
  const styleMoments: StyleMoment[] = selectedCandidates.map((cand, idx) => {
    // Generate alternatives using legal moves from that position
    const posChess = new Chess(cand.fenBefore);
    const legalMoves = posChess.moves({ verbose: true });
    
    // Pick 2 alternative moves that are not the champion move
    const altMoves = legalMoves.filter(lm => lm.san !== cand.san);
    const alt1 = altMoves[0];
    const alt2 = altMoves[1];

    const alternatives: StyleAlternative[] = [];

    if (alt1) {
      alternatives.push({
        moveSan: alt1.san,
        styleTag: 'PASSIVE',
        title: 'Tame Retreat / Slow Development',
        feedback: `Playing ${alt1.san} is safe, but it surrenders the initiative and lets the opponent off the hook. In ${championId}'s style, time and attacking pressure are paramount.`
      });
    }

    if (alt2) {
      alternatives.push({
        moveSan: alt2.san,
        styleTag: 'CAUTIOUS',
        title: 'Cautious Defense',
        feedback: `${alt2.san} is playable, but misses the forceful tactical blow. When an opponent's king is vulnerable, strike immediately!`
      });
    }

    return {
      id: `auto-moment-${idx + 1}`,
      ply: cand.ply,
      moveNumber: cand.moveNumber,
      turn: cand.turn,
      fen: cand.fenBefore,
      prompt: `It is move ${cand.moveNumber}. The position is critical. What is the champion's energetic instinct here?`,
      context: `${cand.theme}. Black and White are locked in sharp tactical tension.`,
      championMoveSan: cand.san,
      championMoveUci: `${cand.from}${cand.to}`,
      tacticalTheme: cand.theme,
      championPhilosophy: `Initiative is the ultimate currency. In this position, ${cand.san} seizes the critical squares, prioritizing dynamic piece activity over passive defense.`,
      highlightSquares: [cand.from, cand.to],
      arrows: [[cand.from, cand.to, '#D4AF37']],
      alternatives
    };
  });

  return { styleMoments, annotations };
}
