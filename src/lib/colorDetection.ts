/**
 * CAISSA-CORE: COLOR DETECTION WATERFALL & ROOT DIVERGENCE ENGINE
 * 
 * Engineering Directive: The Color Detection Waterfall
 * Step 1: Scan the file headers for proprietary flags like [StartFlipped "1"] or [Orientation "Black"].
 * Step 2: Check if a [FEN] tag exists at the root of the game. If the FEN dictates 'b' to move, assign Black and exit.
 * Step 3: Read the first physical move of the file's movetext. If it utilizes the Black continuation format (1...), assign Black and exit.
 * Step 4: If all three lightweight checks fail, deploy the Root Divergence Algorithm to calculate the color based on the tree geometry.
 */

/**
 * Robustly extract a tag value from a PGN string.
 */
export function extractPgnTag(pgn: string, tagName: string): string {
  if (!pgn) return '';
  // 1. Quoted tag: [TagName "Value"] or [TagName 'Value'] or [TagName: "Value"]
  const quotedRegex = new RegExp(`\\[\\s*${tagName}[:\\s]+["']([^"']*)["']\\s*\\]`, 'i');
  const quotedMatch = pgn.match(quotedRegex);
  if (quotedMatch && quotedMatch[1].trim()) {
    return quotedMatch[1].trim();
  }

  // 2. Unquoted tag: [TagName Value]
  const unquotedRegex = new RegExp(`\\[\\s*${tagName}[:\\s]+([^\\s\\]][^\\]]*)\\]`, 'i');
  const unquotedMatch = pgn.match(unquotedRegex);
  if (unquotedMatch && unquotedMatch[1].trim()) {
    return unquotedMatch[1].trim().replace(/^["']|["']$/g, '');
  }

  return '';
}

/**
 * STEP 1: Scan proprietary platform tags
 * Examples: Lichess [StartFlipped "1"], ChessBase/Chess.com [Orientation "Black"], [Flip "1"]
 */
export function checkProprietaryFlags(pgn: string): 'w' | 'b' | null {
  if (!pgn) return null;

  // Lichess study flipped orientation: [StartFlipped "1"]
  const startFlipped = extractPgnTag(pgn, 'StartFlipped');
  if (startFlipped) {
    const val = startFlipped.toLowerCase();
    if (['1', 'true', 'yes', 'black', 'b'].includes(val)) return 'b';
    if (['0', 'false', 'no', 'white', 'w'].includes(val)) return 'w';
  }

  // Explicit Orientation tag: [Orientation "Black"] or [Orientation "White"]
  const orientation = extractPgnTag(pgn, 'Orientation');
  if (orientation) {
    const val = orientation.toLowerCase();
    if (['black', 'b', '1', 'flipped', 'black player'].includes(val)) return 'b';
    if (['white', 'w', '0', 'standard'].includes(val)) return 'w';
  }

  // General Flip flags
  const flip = extractPgnTag(pgn, 'Flip') || extractPgnTag(pgn, 'Flipped') || extractPgnTag(pgn, 'BoardOrientation');
  if (flip) {
    const val = flip.toLowerCase();
    if (['1', 'true', 'yes', 'black', 'b'].includes(val)) return 'b';
    if (['0', 'false', 'no', 'white', 'w'].includes(val)) return 'w';
  }

  // Repertoire / Side tag
  const repertoire = extractPgnTag(pgn, 'Repertoire') || extractPgnTag(pgn, 'Side') || extractPgnTag(pgn, 'Color');
  if (repertoire) {
    const val = repertoire.toLowerCase();
    if (val.includes('black') || val === 'b') return 'b';
    if (val.includes('white') || val === 'w') return 'w';
  }

  return null;
}

/**
 * STEP 2: The FEN "Side to Move" Anchor
 * If root position has [FEN], check the second field ('w' or 'b').
 */
export function checkFenSideToMove(pgn: string): 'w' | 'b' | null {
  if (!pgn) return null;
  const fen = extractPgnTag(pgn, 'FEN');
  if (!fen) return null;

  const parts = fen.trim().split(/\s+/);
  if (parts.length >= 2) {
    const side = parts[1].toLowerCase();
    if (side === 'b') {
      return 'b';
    }
    if (side === 'w') {
      // If it's not standard starting position, White to move means White repertoire
      if (parts[0] !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR') {
        return 'w';
      }
    }
  }
  return null;
}

/**
 * STEP 3: The Black-to-Move Continuation (1...)
 * When a PGN movetext begins directly with Black's response (e.g., 1... c5 or 1... Nf6).
 */
export function checkBlackContinuation(pgn: string): 'w' | 'b' | null {
  if (!pgn) return null;

  // Remove tag pairs
  const withoutTags = pgn.replace(/\[[^\]]*\]/g, ' ');
  // Remove block comments and line comments
  const withoutComments = withoutTags.replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
  // Remove NAGs ($1, $2)
  const withoutNags = withoutComments.replace(/\$\d+/g, ' ');

  const clean = withoutNags.trim();

  // Pattern: starts with 1... or 1. ... or 1.. or 1 … (unicode ellipsis) or \d+\.{2,3}
  const startsWithBlackContinuation = /^(?:1\s*(?:\.{2,3}|…)|1\.\s*(?:\.{2,3}|…))\s*[a-hKQRBN]/i.test(clean);
  if (startsWithBlackContinuation) {
    return 'b';
  }

  // Also check if the first token is a black move like "... c5"
  if (/^(?:\.{2,3}|…)\s*[a-hKQRBN]/i.test(clean)) {
    return 'b';
  }

  return null;
}

/**
 * Clean move list extraction helper
 */
function extractMoveSequence(pgn: string): string[] {
  const withoutTags = pgn.replace(/\[[^\]]*\]/g, ' ');
  const withoutComments = withoutTags.replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/\$\d+/g, ' ');
  const cleanBody = withoutComments.replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim();
  return cleanBody.split(/\s+/).filter(tok => tok && !/^\d+\.+$/.test(tok) && tok !== '...');
}

interface MoveTreeNode {
  children: Map<string, MoveTreeNode>;
}

/**
 * STEP 4: The Root Divergence Algorithm
 * 
 * Repertoire Tree Geometry:
 * In any repertoire, the author plays ONE designated response against every opponent attempt,
 * but must cover ALL possible branching opponent responses.
 * 
 * Consequently:
 * - In a White repertoire, Black (opponent) diverges heavily at odd plies (1... e5, 1... c5, 1... e6).
 * - In a Black repertoire (e.g. Najdorf, Benko, French, King's Indian), White (opponent) diverges heavily
 *   at even plies (at move 1, 2, or at the key tabiya like move 6 in the Najdorf).
 * 
 * We build the move prefix tree and calculate the branching factor at even plies (White's turns)
 * versus odd plies (Black's turns).
 */
export function calculateRootDivergence(
  pgnText: string,
  fileName?: string
): { side: 'w' | 'b'; details: string; whiteBranches: number; blackBranches: number } {
  // Split games to inspect all lines in the repertoire
  const rawGames = pgnText.split(/(?=(?:^|\n)\s*\[(?:Event|White|Date|Site)[:\s]+["'])/i).filter(s => s.trim().length > 10);
  const gamesToAnalyze = rawGames.length > 1 ? rawGames : [pgnText];

  const root: MoveTreeNode = { children: new Map() };
  let totalPliesAnalyzed = 0;

  for (const gamePgn of gamesToAnalyze) {
    const moves = extractMoveSequence(gamePgn);
    if (moves.length === 0) continue;

    let currentNode = root;
    for (let ply = 0; ply < Math.min(moves.length, 30); ply++) {
      const move = moves[ply];
      if (!currentNode.children.has(move)) {
        currentNode.children.set(move, { children: new Map() });
      }
      currentNode = currentNode.children.get(move)!;
      totalPliesAnalyzed++;
    }
  }

  // Count branch points where children.size > 1
  let whiteBranchPoints = 0;
  let blackBranchPoints = 0;
  let whiteExcessBranches = 0;
  let blackExcessBranches = 0;

  function traverse(node: MoveTreeNode, depth: number) {
    const branchCount = node.children.size;
    if (branchCount > 1) {
      if (depth % 2 === 0) {
        // Even depth = White's turn to move
        whiteBranchPoints++;
        whiteExcessBranches += (branchCount - 1);
      } else {
        // Odd depth = Black's turn to move
        blackBranchPoints++;
        blackExcessBranches += (branchCount - 1);
      }
    }

    node.children.forEach((child) => {
      traverse(child, depth + 1);
    });
  }

  traverse(root, 0);

  // If White diverges more, opponent is White -> Black Repertoire
  if (whiteExcessBranches > blackExcessBranches) {
    return {
      side: 'b',
      details: `White branches heavily (${whiteExcessBranches} excess branches) vs Black (${blackExcessBranches} branches)`,
      whiteBranches: whiteExcessBranches,
      blackBranches: blackExcessBranches
    };
  }

  // If Black diverges more, opponent is Black -> White Repertoire
  if (blackExcessBranches > whiteExcessBranches) {
    return {
      side: 'w',
      details: `Black branches heavily (${blackExcessBranches} excess branches) vs White (${whiteExcessBranches} branches)`,
      whiteBranches: whiteExcessBranches,
      blackBranches: blackExcessBranches
    };
  }

  // Tiebreaker or Single-line: Lexical repertoire analysis
  const combinedContext = `${fileName || ''} ${pgnText.slice(0, 1000)}`.toLowerCase();

  const BLACK_DEFENSE_KEYWORDS = [
    'najdorf', 'sicilian', 'benko', 'french defense', 'caro-kann', 'caro kann',
    'king\'s indian', 'kings indian', 'kid', 'nimzo', 'grunfeld', 'grünfeld',
    'slav defense', 'semi-slav', 'qgd', 'queen\'s gambit declined', 'dutch defense',
    'pirc', 'modern defense', 'alekhine', 'scandinavian', 'chigorin', 'budapest',
    'benoni', 'dragon', 'scheveningen', 'sveshnikov', 'taimanov', 'kan', 'kalashnikov',
    'bogo-indian', 'tarrasch', 'marshall attack', 'berlin defense', 'petroff', 'russian defense'
  ];

  const WHITE_OPENING_KEYWORDS = [
    'ruy lopez', 'italian game', 'scotch game', 'king\'s gambit', 'vienna game',
    'london system', 'catalan', 'english opening', 'reti opening', 'bird\'s opening',
    'colle system', 'trompowsky', 'torre attack', 'four knights', 'queen\'s gambit accepted'
  ];

  for (const keyword of BLACK_DEFENSE_KEYWORDS) {
    if (combinedContext.includes(keyword)) {
      return {
        side: 'b',
        details: `Repertoire lexicon matched Black defense: "${keyword}"`,
        whiteBranches: whiteExcessBranches,
        blackBranches: blackExcessBranches
      };
    }
  }

  for (const keyword of WHITE_OPENING_KEYWORDS) {
    if (combinedContext.includes(keyword)) {
      return {
        side: 'w',
        details: `Repertoire lexicon matched White opening: "${keyword}"`,
        whiteBranches: whiteExcessBranches,
        blackBranches: blackExcessBranches
      };
    }
  }

  // Default fallback
  return {
    side: 'w',
    details: 'Default baseline: White',
    whiteBranches: whiteExcessBranches,
    blackBranches: blackExcessBranches
  };
}

/**
 * THE UNIFIED COLOR DETECTION WATERFALL
 * Evaluates in strict order:
 * 1. Manual user override (if provided)
 * 2. Step 1: Proprietary platform tags
 * 3. Step 2: Root FEN side to move
 * 4. Step 3: Black continuation format (1...)
 * 5. Step 4: Root Divergence Algorithm
 */
export function detectRepertoireSideToPlay(
  pgnText: string,
  fileName?: string,
  manualSelection?: 'w' | 'b' | 'auto'
): { side: 'w' | 'b'; reason: string; step: 1 | 2 | 3 | 4 | 'manual' } {
  // Manual selection overrides all automatic detection
  if (manualSelection === 'w') {
    return { side: 'w', reason: 'Explicit manual toggle: White Repertoire', step: 'manual' };
  }
  if (manualSelection === 'b') {
    return { side: 'b', reason: 'Explicit manual toggle: Black Repertoire', step: 'manual' };
  }

  // Step 1: Proprietary Platform Tags
  const flagSide = checkProprietaryFlags(pgnText);
  if (flagSide) {
    return {
      side: flagSide,
      reason: `Step 1: Proprietary flag detected (${flagSide === 'b' ? 'Black / Flipped' : 'White'})`,
      step: 1
    };
  }

  // Step 2: FEN "Side to Move" Anchor
  const fenSide = checkFenSideToMove(pgnText);
  if (fenSide) {
    return {
      side: fenSide,
      reason: `Step 2: Root FEN dictates '${fenSide}' to move`,
      step: 2
    };
  }

  // Step 3: Black-to-Move Continuation (1...)
  const continuationSide = checkBlackContinuation(pgnText);
  if (continuationSide) {
    return {
      side: continuationSide,
      reason: 'Step 3: Movetext begins with Black continuation format (1...)',
      step: 3
    };
  }

  // Step 4: Root Divergence Algorithm & Tree Geometry
  const div = calculateRootDivergence(pgnText, fileName);
  return {
    side: div.side,
    reason: `Step 4: Root Divergence (${div.details})`,
    step: 4
  };
}
