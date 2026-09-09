import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Trash2, 
  Plus, 
  X, 
  Database, 
  ShieldCheck, 
  Zap, 
  Layers, 
  Search, 
  ArrowLeft, 
  Check, 
  Copy, 
  Download, 
  Swords, 
  ChevronRight, 
  Sparkles, 
  Target, 
  Clock, 
  BookOpen,
  FileCode2,
  FolderArchive,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { cn } from '../lib/utils';
import { Chess } from 'chess.js';
import { VaultDB, StoredMasterCard, StoredPgnGame } from '../lib/db';
import { soundEngine } from '../services/soundService';
import { detectRepertoireSideToPlay } from '../lib/colorDetection';

interface PgnVaultProps {
  onBack: () => void;
  onStudyGame?: (pgn: string, orientation?: 'w' | 'b') => void;
  onAnalyze?: (pgn: string) => void;
}

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

const DEFAULT_PAGE_SIZE = 30;

/**
 * Check if a game/variation belongs to a Quickstarter guide.
 * USER DIRECTIVE:
 * "group all the quickstarters inside the master card as another mini quickstarter card
 * just for pgns where white tag includes quickstarter..."
 * On these PGNs the White tag represents the opening or line title.
 */
export function isQuickstarterPgn(game: StoredPgnGame): boolean {
  const white = (game.white || '').toLowerCase();
  const event = (game.event || '').toLowerCase();
  return white.includes('quickstarter') || 
         white.includes('quick starter') || 
         white.includes('quickstart') ||
         event.includes('quickstarter') ||
         event.includes('quick starter');
}

// Starter repertoire sample packs (organized into master files)
const STARTER_MASTER_PACKS: Array<{ 
  fileName: string; 
  sideToPlay?: 'w' | 'b';
  games: Array<{ white: string; black: string; result: string; event: string; date: string; pgn: string }> 
}> = [
  {
    fileName: "Classical_Masterpieces.pgn",
    sideToPlay: 'w',
    games: [
      {
        white: "Garry Kasparov",
        black: "Veselin Topalov",
        result: "1-0",
        event: "Wijk aan Zee (Kasparov's Immortal)",
        date: "1999.01.20",
        pgn: `[Event "Wijk aan Zee"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[Round "4"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[Result "1-0"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`
      },
      {
        white: "Paul Morphy",
        black: "Duke of Brunswick & Count Isouard",
        result: "1-0",
        event: "Paris Opera House",
        date: "1858.11.02",
        pgn: `[Event "Paris Opera"]
[Site "Paris FRA"]
[Date "1858.11.02"]
[Round "?"]
[White "Paul Morphy"]
[Black "Duke of Brunswick & Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`
      },
      {
        white: "Robert James Fischer",
        black: "Boris Spassky",
        result: "1-0",
        event: "World Championship Match (Game 6)",
        date: "1972.07.23",
        pgn: `[Event "World Championship 28th"]
[Site "Reykjavik ISL"]
[Date "1972.07.23"]
[Round "6"]
[White "Robert James Fischer"]
[Black "Boris Spassky"]
[Result "1-0"]

1. c4 e6 2. Nf3 d5 3. d4 Nf6 4. Nc3 Be7 5. Bg5 O-O 6. e3 h6 7. Bh4 b6 8. cxd5 Nxd5 9. Bxe7 Qxe7 10. Nxd5 exd5 11. Rc1 Be6 12. Qa4 c5 13. Qa3 Rc8 14. Bb5 a6 15. dxc5 bxc5 16. O-O Ra7 17. Be2 Nd7 18. Nd4 Qf8 19. Nxe6 fxe6 20. e4 d4 21. f4 Qe7 22. e5 Rb8 23. Bc4 Kh8 24. Qh3 Nf8 25. b3 a5 26. f5 exf5 27. Rxf5 Nh7 28. Rcf1 Qd8 29. Qg3 Re7 30. h4 Rbb7 31. e6 Rbc7 32. Qe5 Qe8 33. a4 Qd8 34. R1f2 Qe8 35. R2f3 Qd8 36. Bd3 Qe8 37. Qe4 Nf6 38. Rxf6 gxf6 39. Rxf6 Kg8 40. Bc4 Kh8 41. Qf4 1-0`
      }
    ]
  },
  {
    fileName: "Modern_Grandmaster_Lines.pgn",
    sideToPlay: 'w',
    games: [
      {
        white: "Magnus Carlsen",
        black: "Hikaru Nakamura",
        result: "1-0",
        event: "London Chess Classic",
        date: "2011.12.10",
        pgn: `[Event "London Chess Classic"]
[Site "London ENG"]
[Date "2011.12.10"]
[Round "7"]
[White "Magnus Carlsen"]
[Black "Hikaru Nakamura"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. d3 Bc5 5. c3 O-O 6. O-O d6 7. h3 Ne7 8. d4 Bb6 9. Bd3 d5 10. exd5 exd4 11. c4 c6 12. Bg5 cxd5 13. Bxf6 gxf6 14. Nbd2 Kh8 15. Nh4 Rg8 16. Qh5 Rg7 17. Rfe1 Be6 18. Re2 Bc7 19. Rae1 Qd7 20. Ndf3 Rag8 21. Rxe6 fxe6 22. Nxd4 dxc4 23. Nxe6 cxd3 24. Nxg7 d2 25. Rd1 Rxg7 26. Qh6 Ng8 27. Qxd2 Qxh3 28. Qd4 Rg4 29. Qd7 Qh2+ 30. Kf1 Qxh4 31. Qxc7 Qh1+ 32. Ke2 Re4+ 33. Kd2 Qxg2 34. Kc1 Qxf2 1-0`
      },
      {
        white: "Fabiano Caruana",
        black: "Levon Aronian",
        result: "1-0",
        event: "Candidates Tournament",
        date: "2018.03.22",
        pgn: `[Event "FIDE Candidates 2018"]
[Site "Berlin GER"]
[Date "2018.03.22"]
[Round "10"]
[White "Fabiano Caruana"]
[Black "Levon Aronian"]
[Result "1-0"]

1. e4 c5 2. Nf3 Nc6 3. Bb5 g6 4. Bxc6 dxc6 5. d3 Bg7 6. h3 Nf6 7. Nc3 Nd7 8. Be3 e5 9. O-O Qe7 10. a3 O-O 11. b4 f5 12. exf5 gxf5 13. Re1 b6 14. Bg5 Qf7 15. Qd2 Bb7 16. Bh6 cxb4 17. axb4 c5 18. Bxg7 Qxg7 19. Ng5 cxb4 20. Nb5 Rf6 21. Nc7 Rg6 22. Nce6 Qe7 23. Rxa7 Rxa7 24. d4 h6 25. d5 hxg5 1-0`
      }
    ]
  },
  {
    fileName: "Sicilian_Najdorf_Black_Repertoire.pgn",
    sideToPlay: 'b',
    games: [
      {
        white: "Quickstarter Guide: Najdorf 6.Be3 Basic Setup",
        black: "Black Repertoire",
        result: "*",
        event: "Quickstarter Guide: Sicilian Najdorf",
        date: "2024.01.01",
        pgn: `[Event "Quickstarter Guide: Sicilian Najdorf"]
[Site "Caissa Vault Study"]
[Date "2024.01.01"]
[White "Quickstarter Guide: Najdorf 6.Be3 Basic Setup"]
[Black "Black Repertoire"]
[Result "*"]
[Orientation "Black"]
[StartFlipped "1"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 *`
      },
      {
        white: "Quickstarter Guide: Najdorf 6.Bg5 Critical Lines",
        black: "Black Repertoire",
        result: "*",
        event: "Quickstarter Guide: Sicilian Najdorf",
        date: "2024.01.01",
        pgn: `[Event "Quickstarter Guide: Sicilian Najdorf"]
[Site "Caissa Vault Study"]
[Date "2024.01.01"]
[White "Quickstarter Guide: Najdorf 6.Bg5 Critical Lines"]
[Black "Black Repertoire"]
[Result "*"]
[Orientation "Black"]
[StartFlipped "1"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Bg5 e6 7. f4 Be7 *`
      },
      {
        white: "Sicilian Najdorf: 6.Bg5 Main Line",
        black: "Black Repertoire",
        result: "*",
        event: "Black Repertoire: Sicilian Najdorf",
        date: "2024.01.01",
        pgn: `[Event "Black Repertoire: Sicilian Najdorf"]
[Site "Caissa Vault Study"]
[Date "2024.01.01"]
[White "Sicilian Najdorf: 6.Bg5 Main Line"]
[Black "Black Repertoire"]
[Result "*"]
[Orientation "Black"]
[StartFlipped "1"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Bg5 e6 7. f4 Be7 8. Qf3 Qc7 9. O-O-O Nbd7 10. Bd3 b5 *`
      },
      {
        white: "Sicilian Najdorf: English Attack",
        black: "Black Repertoire",
        result: "*",
        event: "Black Repertoire: Sicilian Najdorf",
        date: "2024.01.01",
        pgn: `[Event "Black Repertoire: Sicilian Najdorf"]
[Site "Caissa Vault Study"]
[Date "2024.01.01"]
[White "Sicilian Najdorf: English Attack"]
[Black "Black Repertoire"]
[Result "*"]
[Orientation "Black"]
[StartFlipped "1"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 8. f3 Be7 9. Qd2 O-O 10. O-O-O Nbd7 11. g4 b5 *`
      }
    ]
  }
];

/**
 * Robustly extract a tag value from a PGN string.
 * Handles:
 * - [White "Name"]
 * - [White 'Name']
 * - [White: "Name"]
 * - [WHITE "Name"]
 * - [White Name] (unquoted)
 * - Trailing/leading whitespace around key and value
 */
function extractPgnTag(pgn: string, tagName: string): string {
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
 * Fast and resilient move extractor. Does not crash on complex annotations,
 * NAGs, or subvariations, and does not block the UI thread during bulk ingestion.
 */
function extractMovesAndPreview(pgnString: string): { moveCount: number; preview: string } {
  // Strip tag pairs [Tag "Value"]
  const withoutTags = pgnString.replace(/\[[^\]]*\]/g, ' ');
  // Strip block comments { ... }
  const withoutComments = withoutTags.replace(/\{[^}]*\}/g, ' ');
  // Strip line comments ; ...
  const withoutLineComments = withoutComments.replace(/;[^\n]*/g, ' ');
  // Strip recursive variation annotations ( ... )
  const withoutRav = withoutLineComments.replace(/\([^)]*\)/g, ' ');
  // Strip NAG symbols $1, $2, etc.
  const withoutNags = withoutRav.replace(/\$\d+/g, ' ');

  // Clean whitespace
  const cleanBody = withoutNags.replace(/\s+/g, ' ').trim();
  // Strip terminal result marker: 1-0, 0-1, 1/2-1/2, *
  const movesOnly = cleanBody.replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim();

  // Count move tokens (excluding move numbers like '1.' or '1...')
  const tokens = movesOnly.split(/\s+/).filter(tok => tok && !tok.match(/^\d+\.+$/));
  const moveCount = tokens.length;

  let preview = movesOnly.slice(0, 85);
  if (movesOnly.length > 85) preview += '...';

  return {
    moveCount,
    preview: preview || 'No moves recorded'
  };
}

/**
 * Check if a split chunk has sufficient content to be a legitimate PGN game.
 */
function isValidPgnChunk(chunk: string): boolean {
  if (!chunk || chunk.trim().length < 5) return false;
  // Has at least one PGN tag or at least one move/result marker
  const hasTag = /\[\s*[A-Za-z0-9_]+[:\s]/.test(chunk);
  const hasMoves = /\b(?:1\.|[O0]-[O0]|[a-h][1-8]|[KQRBN][a-h1-8]|1-0|0-1|1\/2-1\/2|\*)\b/.test(chunk);
  return hasTag || hasMoves;
}

/**
 * Split multi-game PGN content into individual game strings safely.
 * Handles files with 1000+ games without fragmenting header tags or distorting game counts.
 */
function splitPgnGames(text: string): string[] {
  if (!text || !text.trim()) return [];
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Strategy 1: Standard PGN archives where each game starts with [Event ...]
  // In the PGN standard Seven Tag Roster, Event is the mandatory first tag.
  const eventMatches = normalized.match(/(?:^|\n)\s*\[Event[:\s]+["']/gi);
  if (eventMatches && eventMatches.length > 1) {
    const rawChunks = normalized.split(/(?=(?:^|\n)\s*\[Event[:\s]+["'])/i);
    const valid = rawChunks.map(c => c.trim()).filter(isValidPgnChunk);
    if (valid.length > 1) {
      return valid;
    }
  }

  // Strategy 2: Repertoire files without [Event] where each game starts with [White ...]
  const whiteMatches = normalized.match(/(?:^|\n)\s*\[White[:\s]+["']/gi);
  if (whiteMatches && whiteMatches.length > 1 && (!eventMatches || eventMatches.length <= 1)) {
    const rawChunks = normalized.split(/(?=(?:^|\n)\s*\[White[:\s]+["'])/i);
    const valid = rawChunks.map(c => c.trim()).filter(isValidPgnChunk);
    if (valid.length > 1) {
      return valid;
    }
  }

  // Strategy 3: Universal Line-by-Line State Machine
  // Handles mixed tag orders, non-standard headers, and arbitrary spacing.
  // A new game begins when:
  // 1. A tag occurs after moves have already begun for the current game
  // OR
  // 2. A tag has already appeared in the current game's header block (e.g. duplicate [Event] or duplicate [White])
  const lines = normalized.split('\n');
  const games: string[] = [];
  let currentGameLines: string[] = [];
  let hasMoves = false;
  let seenTagsInCurrentHeader = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Is this line a PGN tag?
    const tagMatch = trimmed.match(/^\[([A-Za-z0-9_]+)[:\s]/);
    const isTagLine = tagMatch !== null && trimmed.endsWith(']');

    if (isTagLine) {
      const tagName = tagMatch[1].toLowerCase();

      // If we already collected moves, or this tag was already seen in current header:
      // Finalize the previous game!
      if ((hasMoves || seenTagsInCurrentHeader.has(tagName)) && currentGameLines.length > 0) {
        const gameText = currentGameLines.join('\n').trim();
        if (isValidPgnChunk(gameText)) {
          games.push(gameText);
        }
        currentGameLines = [];
        hasMoves = false;
        seenTagsInCurrentHeader = new Set();
      }

      seenTagsInCurrentHeader.add(tagName);
      currentGameLines.push(line);
    } else {
      // Non-tag line (moves, comments, empty lines, result)
      if (trimmed.length > 0) {
        hasMoves = true;
      }
      currentGameLines.push(line);
    }
  }

  // Finalize last game
  if (currentGameLines.length > 0) {
    const lastGame = currentGameLines.join('\n').trim();
    if (isValidPgnChunk(lastGame)) {
      games.push(lastGame);
    }
  }

  if (games.length > 0) {
    return games;
  }

  return [normalized];
}

/**
 * Parses individual PGN string into a StoredPgnGame.
 * CRITICAL USER DIRECTIVE:
 * On these PGNs, the White tag is designated as the Opening Name!
 */
function parsePgnGame(pgnString: string, defaultIndex = 0): StoredPgnGame {
  let white = extractPgnTag(pgnString, 'White');
  const black = extractPgnTag(pgnString, 'Black') || 'Black Player';
  const result = extractPgnTag(pgnString, 'Result') || '*';
  const event = extractPgnTag(pgnString, 'Event');
  const date = extractPgnTag(pgnString, 'Date') || '????.??.??';

  // CRITICAL USER MANDATE:
  // "on those pgns the white tag is the name of the opening"
  // If White tag is missing or '?', fall back to Opening, Variation, or Event
  if (!white || white === '?') {
    const opening = extractPgnTag(pgnString, 'Opening');
    const variation = extractPgnTag(pgnString, 'Variation');
    const eco = extractPgnTag(pgnString, 'ECO');

    if (opening && opening !== '?') {
      white = variation ? `${opening}: ${variation}` : opening;
    } else if (variation && variation !== '?') {
      white = variation;
    } else if (event && event !== '?' && !event.toLowerCase().includes('untitled')) {
      white = event;
    } else if (eco && eco !== '?') {
      white = `ECO ${eco} Opening`;
    } else {
      white = `Variation #${defaultIndex + 1}`;
    }
  }

  const { moveCount, preview } = extractMovesAndPreview(pgnString);

  return {
    id: `game-${Date.now()}-${defaultIndex}-${Math.random().toString(36).slice(2, 8)}`,
    white, // White tag is the Opening Name!
    black,
    result,
    event,
    date,
    pgn: pgnString.trim(),
    moveCount,
    preview,
    addedAt: Date.now()
  };
}

export function PgnVault({ onBack, onStudyGame, onAnalyze }: PgnVaultProps) {
  // Master Cards State (1 Master Card per uploaded file)
  const [masterCards, setMasterCards] = useState<StoredMasterCard[]>([]);
  // When activeMasterCardId is non-null, user is inside the Master Card Explorer view!
  const [activeMasterCardId, setActiveMasterCardId] = useState<string | null>(null);

  // Ingestion & Progress State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Search & Filtering
  const [vaultSearchQuery, setVaultSearchQuery] = useState('');
  const [explorerSearchQuery, setExplorerSearchQuery] = useState('');
  const [explorerResultFilter, setExplorerResultFilter] = useState<'ALL' | '1-0' | '0-1' | '1/2-1/2'>('ALL');
  
  // Multi-Selection within active Master Card
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());

  // Explorer Progressive Loading (USER DIRECTIVE: keep initial load to 30 to prevent lag, auto-load 30 more on scroll)
  const [visibleCount, setVisibleCount] = useState<number>(DEFAULT_PAGE_SIZE);

  // Category filter: 'main' variations, 'quickstarter' guide lines, or 'all'
  const [explorerCategoryTab, setExplorerCategoryTab] = useState<'all' | 'main' | 'quickstarter'>('main');

  // Collapsible toggle for the dedicated Mini Quickstarter Card inside Explorer
  const [isQuickstarterSectionExpanded, setIsQuickstarterSectionExpanded] = useState<boolean>(true);

  // Toast feedback
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Modal: Dedicated + UPLOAD PGN Repertoire Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadSideToPlay, setUploadSideToPlay] = useState<'w' | 'b' | 'auto'>('auto');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploadTab, setUploadTab] = useState<'files' | 'paste'>('files');
  const [uploadPastedPgn, setUploadPastedPgn] = useState('');
  const [uploadPastedName, setUploadPastedName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Modal: Add Opening manually into a Master Card
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [manualMasterCardName, setManualMasterCardName] = useState('');
  const [manualOpeningName, setManualOpeningName] = useState(''); // White tag = Opening Name
  const [manualBlackPlayer, setManualBlackPlayer] = useState('Black Player');
  const [manualResult, setManualResult] = useState('*');
  const [manualEvent, setManualEvent] = useState('');
  const [manualPgnText, setManualPgnText] = useState('');
  const [manualSideToPlay, setManualSideToPlay] = useState<'w' | 'b' | 'auto'>('auto');
  const [manualValidationError, setManualValidationError] = useState<string | null>(null);

  // Modal: Confirmation dialog
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Load Master Cards from VaultDB
  useEffect(() => {
    VaultDB.getAllMasterCards().then(cards => {
      if (cards && cards.length > 0) {
        setMasterCards(cards);
      }
    });
  }, []);

  // Currently viewed Master Card
  const currentCard = useMemo(() => {
    if (!activeMasterCardId) return null;
    return masterCards.find(c => c.id === activeMasterCardId) || null;
  }, [masterCards, activeMasterCardId]);

  // Group quickstarter PGNs separately from main opening variations
  // USER MANDATE: "for all uploads group all the quickstarters inside the master card as another mini quickstarter card just for pgns where white tag includes quickstarter..."
  const { quickstarterGames, mainGames } = useMemo(() => {
    if (!currentCard || !currentCard.games) return { quickstarterGames: [], mainGames: [] };
    const quick: StoredPgnGame[] = [];
    const main: StoredPgnGame[] = [];
    for (const g of currentCard.games) {
      if (isQuickstarterPgn(g)) {
        quick.push(g);
      } else {
        main.push(g);
      }
    }
    return { quickstarterGames: quick, mainGames: main };
  }, [currentCard]);

  // Reset visible count and selection on card change or search
  useEffect(() => {
    setVisibleCount(DEFAULT_PAGE_SIZE);
    setSelectedGameIds(new Set());
    if (quickstarterGames.length > 0 && mainGames.length > 0) {
      setExplorerCategoryTab('main'); // Default to main lines so quickstarters don't flood the view!
    } else if (quickstarterGames.length > 0 && mainGames.length === 0) {
      setExplorerCategoryTab('quickstarter');
    } else {
      setExplorerCategoryTab('all');
    }
  }, [activeMasterCardId, quickstarterGames.length, mainGames.length, explorerSearchQuery, explorerResultFilter]);

  // Reset visible count when category tab changes
  useEffect(() => {
    setVisibleCount(DEFAULT_PAGE_SIZE);
  }, [explorerCategoryTab]);

  // Filtered master cards on main screen
  const filteredMasterCards = useMemo(() => {
    if (!vaultSearchQuery.trim()) return masterCards;
    const q = vaultSearchQuery.toLowerCase().trim();
    return masterCards.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.fileName.toLowerCase().includes(q)
    );
  }, [masterCards, vaultSearchQuery]);

  // Filtered games inside the active Master Card (respects category tabs and search)
  const filteredCardGames = useMemo(() => {
    if (!currentCard) return [];

    let baseList = currentCard.games;
    if (quickstarterGames.length > 0) {
      if (explorerCategoryTab === 'main') {
        baseList = mainGames;
      } else if (explorerCategoryTab === 'quickstarter') {
        baseList = quickstarterGames;
      }
    }

    return baseList.filter(g => {
      const q = explorerSearchQuery.toLowerCase().trim();
      const matchesText = !q || 
        g.white.toLowerCase().includes(q) || // Opening name
        g.black.toLowerCase().includes(q) ||
        g.event.toLowerCase().includes(q) ||
        g.preview.toLowerCase().includes(q);

      if (!matchesText) return false;
      if (explorerResultFilter === 'ALL') return true;
      return g.result === explorerResultFilter;
    });
  }, [currentCard, quickstarterGames, mainGames, explorerCategoryTab, explorerSearchQuery, explorerResultFilter]);

  // Progressive infinite scroll slice: starts at 30 items for zero-lag rendering, loads +30 on scroll
  const paginatedCardGames = useMemo(() => {
    return filteredCardGames.slice(0, visibleCount);
  }, [filteredCardGames, visibleCount]);

  // Infinite scroll handler
  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 300) {
      setVisibleCount(prev => {
        if (prev < filteredCardGames.length) {
          return Math.min(prev + DEFAULT_PAGE_SIZE, filteredCardGames.length);
        }
        return prev;
      });
    }
  };

  // Load starter packs
  const handleLoadStarterPacks = async () => {
    setIsProcessing(true);
    const newMasterCards: StoredMasterCard[] = STARTER_MASTER_PACKS.map(pack => {
      const side = pack.sideToPlay || 'w';
      const parsedGames = pack.games.map((g, idx) => {
        const parsed = parsePgnGame(g.pgn, idx);
        parsed.sideToPlay = side;
        return parsed;
      });
      return {
        id: `master-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: pack.fileName,
        fileName: pack.fileName,
        fileSize: 1024 * 5,
        totalGames: parsedGames.length,
        createdAt: Date.now(),
        sideToPlay: side,
        games: parsedGames
      };
    });

    await VaultDB.saveMasterCards(newMasterCards);
    setMasterCards(prev => [...newMasterCards, ...prev]);
    setIsProcessing(false);
    soundEngine.play('success');
    showFeedback(`Loaded ${newMasterCards.length} Starter Master Cards.`);
  };

  /**
   * Process multiple files selected at once:
   * "first of all allow multiple select upload like i can select 10 15 files at once and upload"
   * "and secondly when i upload it should create n master cards based on the no. of files i upload"
   * "the name of the master card should be same as the name of the uploaded file"
   */
  const handleMultipleFiles = async (files: FileList | File[], overrideSide?: 'w' | 'b' | 'auto') => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const fileList = Array.from(files);
    const newCards: StoredMasterCard[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setProcessingStatus(`Parsing File ${i + 1} of ${fileList.length}: "${file.name}"...`);
      setProgressPercent(Math.round(((i) / fileList.length) * 100));

      // Read file text
      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsText(file);
      });

      if (!text.trim()) continue;

      // Determine perspective: explicit override takes precedence; otherwise 4-step logic ladder
      const effectiveSide: 'w' | 'b' = (overrideSide === 'w' || overrideSide === 'b')
        ? overrideSide
        : detectRepertoireSideToPlay(text, file.name).side;

      // Split into individual PGN lines/games
      const rawGames = splitPgnGames(text);
      if (rawGames.length === 0) continue;

      // Parse each game with periodic UI yields to prevent main thread blocking on 1000+ game files
      const parsedGames: StoredPgnGame[] = [];
      const totalRaw = rawGames.length;
      for (let g = 0; g < totalRaw; g++) {
        const parsed = parsePgnGame(rawGames[g], g);
        parsed.sideToPlay = effectiveSide;
        parsedGames.push(parsed);
        if (g > 0 && g % 200 === 0) {
          setProcessingStatus(`Parsing "${file.name}": ${g}/${totalRaw} variations...`);
          setProgressPercent(Math.round(((i + (g / totalRaw)) / fileList.length) * 100));
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      // Create a Master Card named exactly as the uploaded file
      const card: StoredMasterCard = {
        id: `master-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name, // "the name of the master card should be same as the name of the uploaded file"
        fileName: file.name,
        fileSize: file.size,
        totalGames: parsedGames.length,
        createdAt: Date.now(),
        sideToPlay: effectiveSide,
        games: parsedGames
      };

      newCards.push(card);
    }

    if (newCards.length > 0) {
      await VaultDB.saveMasterCards(newCards);
      setMasterCards(prev => [...newCards, ...prev]);
      soundEngine.play('success');
      showFeedback(`Created ${newCards.length} Master Card(s) with ${newCards.reduce((acc, c) => acc + c.totalGames, 0)} total variations.`);
    } else {
      showFeedback('No valid PGN variations could be extracted from selected files.');
    }

    setIsProcessing(false);
    setProcessingStatus('');
    setProgressPercent(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit from the + UPLOAD PGN Repertoire modal
  const handleUploadModalSubmit = async () => {
    if (uploadTab === 'files') {
      if (stagedFiles.length === 0) {
        showFeedback('Please select or drop at least one PGN file.');
        return;
      }
      await handleMultipleFiles(stagedFiles, uploadSideToPlay);
      setStagedFiles([]);
      setIsUploadModalOpen(false);
    } else {
      const text = uploadPastedPgn.trim();
      if (!text) {
        showFeedback('Please enter or paste PGN moves.');
        return;
      }

      const cardName = uploadPastedName.trim() || 'Uploaded_Repertoire.pgn';
      const effectiveSide: 'w' | 'b' = (uploadSideToPlay === 'w' || uploadSideToPlay === 'b')
        ? uploadSideToPlay
        : detectRepertoireSideToPlay(text, cardName).side;

      const rawGames = splitPgnGames(text);
      if (rawGames.length === 0) {
        showFeedback('No valid PGN variations could be extracted.');
        return;
      }

      const parsedGames = rawGames.map((rg, idx) => {
        const parsed = parsePgnGame(rg, idx);
        parsed.sideToPlay = effectiveSide;
        return parsed;
      });

      const card: StoredMasterCard = {
        id: `master-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: cardName.endsWith('.pgn') ? cardName : `${cardName}.pgn`,
        fileName: cardName.endsWith('.pgn') ? cardName : `${cardName}.pgn`,
        fileSize: text.length,
        totalGames: parsedGames.length,
        createdAt: Date.now(),
        sideToPlay: effectiveSide,
        games: parsedGames
      };

      await VaultDB.saveMasterCard(card);
      setMasterCards(prev => [card, ...prev]);
      soundEngine.play('success');
      showFeedback(`Ingested "${card.name}" with ${card.totalGames} variations (${effectiveSide === 'b' ? 'Black' : 'White'}).`);
      setUploadPastedPgn('');
      setUploadPastedName('');
      setIsUploadModalOpen(false);
    }
  };

  // Quick toggle perspective on a Master Card (e.g., from White to Black or vice versa)
  const handleToggleCardSide = async (cardId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const card = masterCards.find(c => c.id === cardId);
    if (!card) return;
    const newSide: 'w' | 'b' = card.sideToPlay === 'b' ? 'w' : 'b';
    await VaultDB.updateMasterCardSideToPlay(cardId, newSide);
    setMasterCards(prev => prev.map(c => c.id === cardId ? {
      ...c,
      sideToPlay: newSide,
      games: c.games.map(g => ({ ...g, sideToPlay: newSide }))
    } : c));
    soundEngine.play('move');
    showFeedback(`Switched "${card.name}" to ${newSide === 'b' ? 'Black' : 'White'} Repertoire.`);
  };

  // Option 1: "Option to train entire card where it goes line by line for all the small pgns inside that master card"
  const handleTrainEntireCard = (card: StoredMasterCard) => {
    if (!card.games || card.games.length === 0) {
      showFeedback('This master card contains no variations.');
      return;
    }
    const combinedPgn = card.games.map(g => g.pgn).join('\n\n');
    const side = card.sideToPlay || 'w';
    soundEngine.play('success');
    showFeedback(`Launching Matrix drill for all ${card.games.length} variations in "${card.name}" as ${side === 'b' ? 'Black' : 'White'}...`);
    onStudyGame?.(combinedPgn, side);
  };

  // Train selected lines within the active Master Card
  const handleTrainSelectedLines = () => {
    if (!currentCard || selectedGameIds.size === 0) return;
    const selectedGames = currentCard.games.filter(g => selectedGameIds.has(g.id));
    if (selectedGames.length === 0) return;

    const combinedPgn = selectedGames.map(g => g.pgn).join('\n\n');
    const side = currentCard.sideToPlay || selectedGames[0]?.sideToPlay || 'w';
    soundEngine.play('success');
    showFeedback(`Launching Matrix drill for ${selectedGames.length} selected lines as ${side === 'b' ? 'Black' : 'White'}...`);
    onStudyGame?.(combinedPgn, side);
  };

  // Train all Quickstarter lines in active card
  const handleTrainQuickstarters = (qGames: StoredPgnGame[]) => {
    if (!currentCard || qGames.length === 0) return;
    const combinedPgn = qGames.map(g => g.pgn).join('\n\n');
    const side = currentCard.sideToPlay || 'w';
    soundEngine.play('success');
    showFeedback(`Launching Matrix drill for ${qGames.length} Quickstarter guide variations as ${side === 'b' ? 'Black' : 'White'}...`);
    onStudyGame?.(combinedPgn, side);
  };

  // Train a single line in Matrix
  const handleTrainSingleLine = (gameOrPgn: StoredPgnGame | string) => {
    soundEngine.play('move');
    if (typeof gameOrPgn === 'string') {
      const detected = detectRepertoireSideToPlay(gameOrPgn).side;
      onStudyGame?.(gameOrPgn, currentCard?.sideToPlay || detected);
    } else {
      const side = gameOrPgn.sideToPlay || currentCard?.sideToPlay || 'w';
      onStudyGame?.(gameOrPgn.pgn, side);
    }
  };

  // Delete an entire Master Card
  const promptDeleteMasterCard = (card: StoredMasterCard, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: 'Delete Master Card',
      message: `Permanently delete "${card.name}" and all of its ${card.totalGames} PGN variations?`,
      confirmLabel: 'Delete Master Card',
      onConfirm: async () => {
        await VaultDB.deleteMasterCard(card.id);
        setMasterCards(prev => prev.filter(c => c.id !== card.id));
        if (activeMasterCardId === card.id) {
          setActiveMasterCardId(null);
        }
        soundEngine.play('fault');
        showFeedback(`Deleted "${card.name}".`);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Delete a single variation inside a Master Card
  const promptDeleteSingleLine = (gameId: string, openingName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentCard) return;

    setConfirmModal({
      isOpen: true,
      title: 'Delete Variation',
      message: `Remove "${openingName}" from "${currentCard.name}"?`,
      confirmLabel: 'Delete Line',
      onConfirm: async () => {
        const updatedGames = currentCard.games.filter(g => g.id !== gameId);
        await VaultDB.updateMasterCardGames(currentCard.id, updatedGames);
        setMasterCards(prev => prev.map(c => c.id === currentCard.id ? { ...c, games: updatedGames, totalGames: updatedGames.length } : c));
        soundEngine.play('fault');
        showFeedback('Variation deleted.');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Purge entire vault
  const promptClearVault = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Purge Entire Vault',
      message: `Permanently delete all ${masterCards.length} master card repertoires? This action cannot be undone.`,
      confirmLabel: 'Purge Vault',
      onConfirm: async () => {
        await VaultDB.clearAll();
        setMasterCards([]);
        setActiveMasterCardId(null);
        soundEngine.play('fault');
        showFeedback('Vault purged successfully.');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Export Master Card as .pgn
  const handleExportMasterCard = (card: StoredMasterCard, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!card.games || card.games.length === 0) return;
    const fullPgn = card.games.map(g => g.pgn).join('\n\n\n');
    const blob = new Blob([fullPgn], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = card.fileName.endsWith('.pgn') ? card.fileName : `${card.fileName}.pgn`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showFeedback(`Exported "${card.fileName}" (${card.totalGames} lines).`);
  };

  // Copy PGN to clipboard
  const handleCopyPgn = (pgn: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(pgn);
    soundEngine.play('move');
    showFeedback('PGN copied to clipboard.');
  };

  // Toggle selection for single line
  const toggleSelectGame = (gameId: string) => {
    setSelectedGameIds(prev => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  };

  // Toggle select all on current filtered list
  const toggleSelectAll = () => {
    if (selectedGameIds.size === filteredCardGames.length && filteredCardGames.length > 0) {
      setSelectedGameIds(new Set());
    } else {
      setSelectedGameIds(new Set(filteredCardGames.map(g => g.id)));
    }
  };

  // Save manual line from modal
  const handleSaveManualOpening = async () => {
    const openingName = manualOpeningName.trim() || 'Custom Variation';
    const cardTargetName = manualMasterCardName.trim() || 'Manual_Repertoire.pgn';
    const moves = manualPgnText.trim();

    if (!moves) {
      setManualValidationError('Please enter or paste PGN moves.');
      return;
    }

    const pgnHeader = `[White "${openingName}"]
[Black "${manualBlackPlayer.trim() || 'Black Player'}"]
[Result "${manualResult}"]
${manualEvent ? `[Event "${manualEvent.trim()}"]` : ''}
[Date "${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}"]

`;
    const fullPgn = moves.includes('[White') ? moves : pgnHeader + moves;
    const parsedGame = parsePgnGame(fullPgn);
    parsedGame.white = openingName; // Designate White as Opening name
    if (manualBlackPlayer) parsedGame.black = manualBlackPlayer;

    const effectiveSide: 'w' | 'b' = (manualSideToPlay === 'w' || manualSideToPlay === 'b')
      ? manualSideToPlay
      : detectRepertoireSideToPlay(fullPgn, cardTargetName).side;
    parsedGame.sideToPlay = effectiveSide;

    // Check if target Master Card exists
    const existing = masterCards.find(c => c.name.toLowerCase() === cardTargetName.toLowerCase());

    if (existing) {
      const updatedGames = [parsedGame, ...existing.games];
      await VaultDB.updateMasterCardGames(existing.id, updatedGames);
      setMasterCards(prev => prev.map(c => c.id === existing.id ? { 
        ...c, 
        games: updatedGames, 
        totalGames: updatedGames.length,
        sideToPlay: c.sideToPlay || effectiveSide 
      } : c));
    } else {
      const newCard: StoredMasterCard = {
        id: `master-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: cardTargetName.endsWith('.pgn') ? cardTargetName : `${cardTargetName}.pgn`,
        fileName: cardTargetName.endsWith('.pgn') ? cardTargetName : `${cardTargetName}.pgn`,
        fileSize: 1024,
        totalGames: 1,
        createdAt: Date.now(),
        sideToPlay: effectiveSide,
        games: [parsedGame]
      };
      await VaultDB.saveMasterCard(newCard);
      setMasterCards(prev => [newCard, ...prev]);
    }

    soundEngine.play('success');
    showFeedback(`Added "${openingName}" to "${cardTargetName}".`);
    setIsAddModalOpen(false);
    setManualMasterCardName('');
    setManualOpeningName('');
    setManualPgnText('');
    setManualValidationError(null);
  };

  return (
    <div className="h-screen w-full bg-void text-titanium flex flex-col relative overflow-hidden select-none">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
        <Database className="w-96 h-96" />
      </div>

      {/* 1. TOP COMMAND BAR */}
      <header className="p-3 sm:p-5 md:px-8 border-b border-white/5 flex flex-wrap items-center justify-between gap-2 sm:gap-4 z-20 backdrop-blur-md bg-void/80">
        <div className="flex items-center gap-3">
          {activeMasterCardId ? (
            <button 
              onClick={() => setActiveMasterCardId(null)}
              className="p-2 rounded-xl bg-white/5 border border-white/15 text-tritium-gold hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1.5"
              title="Return to Master Cards Overview"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider hidden sm:inline">Master Cards</span>
            </button>
          ) : (
            <div className="p-2.5 rounded-xl bg-tritium-gold/10 border border-tritium-gold/30">
              <FolderArchive className="w-5 h-5 text-tritium-gold" />
            </div>
          )}

          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight italic text-white flex items-center gap-2">
              {activeMasterCardId && currentCard ? (
                <>
                  <span className="truncate max-w-[280px] sm:max-w-[420px] text-tritium-gold">
                    {currentCard.name}
                  </span>
                  <span className="text-[10px] font-mono not-italic px-2 py-0.5 rounded bg-white/10 text-white font-bold tracking-widest shrink-0">
                    EXPLORER
                  </span>
                </>
              ) : (
                <>
                  PGN_VAULT
                  <span className="text-[10px] font-mono not-italic px-2 py-0.5 rounded bg-tritium-gold/20 text-tritium-gold font-bold tracking-widest">
                    MASTER CARDS
                  </span>
                </>
              )}
            </h1>
            <p className="text-[10px] font-mono text-muted-grey uppercase tracking-[0.2em] mt-0.5">
              {activeMasterCardId && currentCard ? (
                `${currentCard.totalGames} Variations // White Tag is Opening Name`
              ) : (
                `Total Master Cards: ${masterCards.length} // Multiple File Ingestion Active`
              )}
            </p>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* + Upload PGN Button (opens modal with Side to Play selector) */}
          <button 
            disabled={isProcessing}
            onClick={() => {
              setUploadSideToPlay('auto');
              setStagedFiles([]);
              setIsUploadModalOpen(true);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg bg-tritium-gold text-void font-black text-xs uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(212,175,55,0.25)] active:scale-95 cursor-pointer",
              isProcessing && "opacity-50 cursor-not-allowed"
            )}
          >
            <Upload className="w-4 h-4 stroke-[2.5]" />
            <span>+ Upload PGN</span>
          </button>

          {/* Add Opening Button */}
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg glass-card border-white/15 text-white hover:border-tritium-gold/50 hover:bg-white/5 transition-all text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
          >
            <Plus className="w-4 h-4 text-tritium-gold" />
            <span className="hidden sm:inline">Add Opening</span>
          </button>

          {/* Purge Vault */}
          {masterCards.length > 0 && !activeMasterCardId && (
            <button 
              onClick={promptClearVault}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-red-500/20 text-red-400/80 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/40 transition-all cursor-pointer text-xs font-mono"
              title="Purge Entire Vault"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden md:inline">Purge</span>
            </button>
          )}

          {/* Close Vault */}
          <button 
            onClick={onBack}
            className="p-2.5 rounded-lg glass-card border-white/10 text-muted-grey hover:text-white hover:border-white/30 transition-all cursor-pointer ml-1"
            title="Return to Command Center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* PROCESSING TELEMETRY BANNER */}
      {isProcessing && (
        <div className="p-3 px-6 bg-tritium-gold/15 border-b border-tritium-gold/30 flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-tritium-gold animate-ping" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              {processingStatus || 'Processing PGN Files...'}
            </span>
          </div>
          <span className="text-xs font-mono font-black text-tritium-gold">
            {progressPercent}%
          </span>
        </div>
      )}

      {/* FEEDBACK TOAST */}
      <AnimatePresence>
        {feedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-[#0d0f14] border border-tritium-gold/40 text-tritium-gold px-5 py-2.5 rounded-xl shadow-[0_0_30px_rgba(212,175,55,0.2)] text-xs font-mono font-bold flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{feedbackMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. BODY CONTENT: MASTER CARDS OVERVIEW OR EXPLORER VIEW */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!activeMasterCardId ? (
          /* ========================================================================= */
          /* VIEW A: MASTER CARDS OVERVIEW SCREEN                                      */
          /* Displays N Master Cards created from uploaded files                       */
          /* ========================================================================= */
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 pb-28 sm:pb-8 flex flex-col">
            
            {/* Search and Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex-1 min-w-[260px] flex items-center gap-3 glass-card px-4 py-2.5 border-white/10 focus-within:border-tritium-gold/50 transition-colors">
                <Search className="w-4 h-4 text-tritium-gold" />
                <input 
                  type="text"
                  placeholder="SEARCH MASTER CARDS BY FILE NAME..."
                  value={vaultSearchQuery}
                  onChange={(e) => setVaultSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-mono w-full text-white placeholder:text-muted-grey uppercase tracking-wider"
                />
                {vaultSearchQuery && (
                  <button 
                    onClick={() => setVaultSearchQuery('')}
                    className="text-muted-grey hover:text-white text-xs font-mono"
                  >
                    CLEAR
                  </button>
                )}
              </div>

              {masterCards.length > 0 && (
                <div className="text-xs font-mono text-muted-grey">
                  Showing <span className="text-white font-bold">{filteredMasterCards.length}</span> of {masterCards.length} Master Card(s)
                </div>
              )}
            </div>

            {/* Empty State */}
            {masterCards.length === 0 ? (
              <div className="flex-1 min-h-[420px] flex flex-col items-center justify-center gap-6 text-center max-w-lg mx-auto">
                <div className="w-24 h-24 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.05)]">
                  <FileCode2 className="w-10 h-10 text-tritium-gold/60" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">No Master Cards Ingested</h3>
                  <p className="text-xs font-mono text-muted-grey mt-2 leading-relaxed">
                    Upload single or multiple PGN files. The vault will automatically create an individual Master Card for each file, preserving its exact file name and cataloging every variation inside.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
                  <button 
                    onClick={() => {
                      setUploadSideToPlay('auto');
                      setStagedFiles([]);
                      setIsUploadModalOpen(true);
                    }}
                    className="w-full py-3 rounded-lg bg-tritium-gold text-void font-black text-xs uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4 stroke-[2.5]" />
                    <span>+ Upload PGN (Multi-Select)</span>
                  </button>

                  <button
                    onClick={handleLoadStarterPacks}
                    className="w-full py-3 rounded-lg glass-card border-white/20 text-white hover:border-tritium-gold/40 hover:bg-white/5 font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-tritium-gold" />
                    <span>Load Starter Pack</span>
                  </button>
                </div>
              </div>
            ) : filteredMasterCards.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-20">
                <Search className="w-8 h-8 text-muted-grey" />
                <p className="text-xs font-mono text-muted-grey uppercase tracking-widest">
                  No master card matches "{vaultSearchQuery}"
                </p>
                <button
                  onClick={() => setVaultSearchQuery('')}
                  className="text-xs font-mono text-tritium-gold hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              /* MASTER CARDS GRID: 1 MASTER CARD PER UPLOADED FILE */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
                {filteredMasterCards.map((card, idx) => {
                  const firstVariation = card.games[0];
                  return (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                    >
                      <GlassCard className="p-6 h-full flex flex-col justify-between border-white/10 bg-void/60 hover:border-tritium-gold/50 transition-all group relative overflow-hidden">
                        
                        <div>
                          {/* Card Header: File Name & Stats */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="p-2.5 rounded-xl bg-tritium-gold/10 border border-tritium-gold/25 text-tritium-gold shrink-0 mt-0.5">
                                <FileCode2 className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                {/* NAME OF MASTER CARD IS THE FILE NAME */}
                                <h2 className="text-base font-black text-white truncate tracking-tight group-hover:text-tritium-gold transition-colors" title={card.name}>
                                  {card.name}
                                </h2>
                                <p className="text-[10px] font-mono text-muted-grey uppercase tracking-widest mt-0.5">
                                  {new Date(card.createdAt).toLocaleDateString()}
                                  {card.fileSize ? ` • ${(card.fileSize / 1024).toFixed(1)} KB` : ''}
                                </p>
                              </div>
                            </div>

                            {/* Options menu: Delete & Export */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => handleExportMasterCard(card, e)}
                                className="p-1.5 rounded text-white/30 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                title="Export this file to .pgn"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => promptDeleteMasterCard(card, e)}
                                className="p-1.5 rounded text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete Master Card"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Total Lines / Games Pill & Perspective Badge */}
                          <div className="mb-4 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-tritium-gold font-mono text-[11px] font-bold">
                              <Layers className="w-3.5 h-3.5" />
                              <span>{card.totalGames.toLocaleString()} Variation{card.totalGames === 1 ? '' : 's'} inside</span>
                            </span>

                            {/* Perspective Badge with Quick Toggle */}
                            <button
                              onClick={(e) => handleToggleCardSide(card.id, e)}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[10px] font-bold border transition-all cursor-pointer",
                                card.sideToPlay === 'b'
                                  ? "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25"
                                  : "bg-cyan-500/15 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25"
                              )}
                              title="Click to toggle perspective between Black and White repertoire"
                            >
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: card.sideToPlay === 'b' ? '#f59e0b' : '#06b6d4' }} />
                              <span>{card.sideToPlay === 'b' ? '⚫ BLACK' : '⚪ WHITE'}</span>
                              <RotateCcw className="w-3 h-3 opacity-60 hover:opacity-100 ml-0.5" />
                            </button>

                            {/* Mini Quickstarter indicator badge */}
                            {card.games.some(isQuickstarterPgn) && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/35 text-amber-300 font-mono text-[10px] font-bold">
                                <Zap className="w-3 h-3 fill-current" />
                                <span>⚡ {card.games.filter(isQuickstarterPgn).length} Quickstarters</span>
                              </span>
                            )}
                          </div>

                          {/* Preview snippet from opening line */}
                          {firstVariation && (
                            <div className="mb-5 p-3 rounded-lg bg-black/40 border border-white/5 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] font-mono text-muted-grey">
                                <span className="text-tritium-gold font-bold truncate max-w-[200px]">
                                  {firstVariation.white}
                                </span>
                                <span>{firstVariation.moveCount} plies</span>
                              </div>
                              <p className="text-[11px] font-mono text-titanium/70 line-clamp-2 leading-relaxed">
                                {firstVariation.preview}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* ========================================================================= */}
                        {/* THE TWO REQUIRED OPTIONS BENEATH THE MASTER CARD:                         */}
                        {/* 1. Option to train entire card (goes line by line for all small PGNs)     */}
                        {/* 2. Near that, option to explore and select different PGNs                 */}
                        {/* ========================================================================= */}
                        <div className="pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          
                          {/* OPTION 1: TRAIN ENTIRE CARD */}
                          <button
                            onClick={() => handleTrainEntireCard(card)}
                            className="w-full py-2.5 px-3 rounded-lg bg-tritium-gold hover:bg-white text-void font-mono text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(212,175,55,0.25)] active:scale-95 cursor-pointer"
                            title={`Train all variations in this card sequentially as ${card.sideToPlay === 'b' ? 'Black' : 'White'}`}
                          >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>Train Entire Card</span>
                          </button>

                          {/* OPTION 2: EXPLORE AND SELECT DIFFERENT PGNS */}
                          <button
                            onClick={() => setActiveMasterCardId(card.id)}
                            className="w-full py-2.5 px-3 rounded-lg glass-card border-white/15 hover:border-tritium-gold/50 hover:bg-white/10 text-white font-mono text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                            title="Inspect individual PGN lines inside this card"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-tritium-gold" />
                            <span>Explore & Select</span>
                          </button>
                        </div>

                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* VIEW B: MASTER CARD EXPLORER VIEW                                         */
          /* Shows individual PGNs inside the big Master Card                          */
          /* USER DIRECTIVE: on those PGNs, the White tag is the name of the opening   */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Explorer Toolbar */}
            <div className="p-4 px-6 md:px-8 border-b border-white/5 bg-void/50 flex flex-wrap items-center justify-between gap-4 z-10">
              
              {/* Search Inside Card */}
              <div className="flex-1 min-w-[240px] flex items-center gap-3 glass-card px-4 py-2 border-white/10 focus-within:border-tritium-gold/50 transition-colors">
                <Search className="w-4 h-4 text-tritium-gold" />
                <input 
                  type="text"
                  placeholder="SEARCH VARIATIONS BY OPENING NAME (WHITE TAG), BLACK, OR MOVES..."
                  value={explorerSearchQuery}
                  onChange={(e) => setExplorerSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-mono w-full text-white placeholder:text-muted-grey uppercase tracking-wider"
                />
                {explorerSearchQuery && (
                  <button 
                    onClick={() => setExplorerSearchQuery('')}
                    className="text-muted-grey hover:text-white text-xs font-mono"
                  >
                    CLEAR
                  </button>
                )}
              </div>

              {/* Filter and Selection Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                
                {/* Result Filter Tabs */}
                <div className="flex items-center gap-1 glass-card p-1 border-white/10">
                  {(['ALL', '1-0', '0-1', '1/2-1/2'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setExplorerResultFilter(r)}
                      className={cn(
                        "px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer",
                        explorerResultFilter === r 
                          ? "bg-tritium-gold text-void" 
                          : "text-muted-grey hover:text-white"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {/* Select All Toggle */}
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded glass-card border-white/10 hover:border-white/30 text-white text-[10px] font-mono uppercase tracking-wider cursor-pointer"
                >
                  {selectedGameIds.size === filteredCardGames.length && filteredCardGames.length > 0 ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-tritium-gold" />
                      <span>Deselect All</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-muted-grey" />
                      <span>Select All ({filteredCardGames.length})</span>
                    </>
                  )}
                </button>

                {/* Train Selected (K) */}
                {selectedGameIds.size > 0 && (
                  <button
                    onClick={handleTrainSelectedLines}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-tritium-gold text-void text-[10px] font-black uppercase tracking-wider hover:bg-white transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Train Selected ({selectedGameIds.size})</span>
                  </button>
                )}

                {/* Perspective Badge Toggle for Current Card */}
                {currentCard && (
                  <button
                    onClick={(e) => handleToggleCardSide(currentCard.id, e)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[10px] font-bold border transition-all cursor-pointer",
                      currentCard.sideToPlay === 'b'
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25"
                        : "bg-cyan-500/15 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25"
                    )}
                    title="Click to toggle perspective between Black and White repertoire"
                  >
                    <span>{currentCard.sideToPlay === 'b' ? '⚫ BLACK PERSPECTIVE' : '⚪ WHITE PERSPECTIVE'}</span>
                    <RotateCcw className="w-3 h-3 opacity-70 ml-0.5" />
                  </button>
                )}

                {/* Train Entire Card */}
                {currentCard && (
                  <button
                    onClick={() => handleTrainEntireCard(currentCard)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded border border-tritium-gold/40 text-tritium-gold hover:bg-tritium-gold/15 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Train All ({currentCard.totalGames})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Individual Variations List & Dedicated Mini Quickstarter Card */}
            <div onScroll={handleListScroll} className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 pb-28 sm:pb-8 scrollbar-hide">

              {/* ========================================================================= */}
              {/* USER MANDATE: Group all quickstarters inside the master card as another   */}
              {/* mini quickstarter card just for PGNs where White tag includes quickstarter */}
              {/* ========================================================================= */}
              {quickstarterGames.length > 0 && (
                <div className="mb-6">
                  <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-black/85 to-tritium-gold/10 border border-amber-500/40 shadow-[0_0_35px_rgba(245,158,11,0.12)] relative overflow-hidden backdrop-blur-md">
                    {/* Ambient glow */}
                    <div className="absolute top-0 right-0 w-80 h-36 bg-amber-500/10 blur-3xl pointer-events-none" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                      <div className="flex items-start gap-3.5">
                        <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
                          <Zap className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/50 tracking-wider flex items-center gap-1">
                              <Zap className="w-2.5 h-2.5 fill-current" />
                              MINI QUICKSTARTER CARD
                            </span>
                            <span className="text-xs font-mono text-muted-grey">
                              {quickstarterGames.length} Essential Variation{quickstarterGames.length === 1 ? '' : 's'} Grouped
                            </span>
                          </div>
                          <h3 className="text-base md:text-lg font-black text-white tracking-tight mt-1">
                            Quickstarter Overview Module
                          </h3>
                          <p className="text-xs font-mono text-titanium/80 mt-0.5 max-w-2xl">
                            Grouped separately from main repertoire lines so you can train foundational ideas quickly without cluttering your full variation tree.
                          </p>
                        </div>
                      </div>

                      {/* Quickstarter Mini Card Controls */}
                      <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                        <button
                          onClick={() => handleTrainQuickstarters(quickstarterGames)}
                          className="px-4 py-2.5 rounded-lg bg-amber-400 hover:bg-white text-void font-mono text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer active:scale-95"
                          title={`Train all ${quickstarterGames.length} quickstarter lines in Matrix`}
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Train Quickstarters ({quickstarterGames.length})</span>
                        </button>

                        <button
                          onClick={() => setIsQuickstarterSectionExpanded(!isQuickstarterSectionExpanded)}
                          className="px-3.5 py-2.5 rounded-lg glass-card border-white/20 hover:border-amber-400/50 hover:bg-white/10 text-white font-mono text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          {isQuickstarterSectionExpanded ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                              <span>Collapse Lines</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                              <span>View {quickstarterGames.length} Lines</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Quickstarter Lines Grid */}
                    <AnimatePresence>
                      {isQuickstarterSectionExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-5 pt-4 border-t border-amber-500/20 space-y-2.5 overflow-hidden"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                            {quickstarterGames.map((qg) => (
                              <div
                                key={qg.id}
                                className="p-3.5 rounded-xl bg-black/60 border border-amber-500/20 hover:border-amber-500/50 transition-all flex items-center justify-between gap-3 group/qs"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                      QS
                                    </span>
                                    <span className="text-xs font-bold text-white truncate" title={qg.white}>
                                      {qg.white}
                                    </span>
                                  </div>
                                  <p className="text-[10px] font-mono text-muted-grey truncate mt-1">
                                    {qg.preview}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => handleTrainSingleLine(qg.pgn)}
                                    className="px-2.5 py-1.5 rounded bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-void text-[10px] font-mono font-black uppercase transition-all cursor-pointer"
                                    title="Train this quickstarter line in Matrix"
                                  >
                                    Train
                                  </button>
                                  {onAnalyze && (
                                    <button
                                      onClick={() => onAnalyze(qg.pgn)}
                                      className="p-1.5 rounded glass-card border-white/10 hover:border-emerald-500/50 hover:text-emerald-400 text-white/50 text-[10px] cursor-pointer"
                                      title="Analyze line"
                                    >
                                      <Target className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Category Filter Tabs when Quickstarters exist */}
              {quickstarterGames.length > 0 && (
                <div className="flex items-center justify-between gap-4 mb-5 flex-wrap border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => { setExplorerCategoryTab('main'); setVisibleCount(DEFAULT_PAGE_SIZE); }}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                        explorerCategoryTab === 'main'
                          ? "bg-tritium-gold text-void shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                          : "glass-card border-white/10 text-muted-grey hover:text-white"
                      )}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Main Repertoire ({mainGames.length})</span>
                    </button>

                    <button
                      onClick={() => { setExplorerCategoryTab('quickstarter'); setVisibleCount(DEFAULT_PAGE_SIZE); }}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                        explorerCategoryTab === 'quickstarter'
                          ? "bg-amber-400 text-void shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                          : "glass-card border-white/10 text-muted-grey hover:text-white"
                      )}
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Quickstarter Guide ({quickstarterGames.length})</span>
                    </button>

                    <button
                      onClick={() => { setExplorerCategoryTab('all'); setVisibleCount(DEFAULT_PAGE_SIZE); }}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                        explorerCategoryTab === 'all'
                          ? "bg-white/20 text-white border-white/40"
                          : "glass-card border-white/10 text-muted-grey hover:text-white"
                      )}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>All Variations ({currentCard?.games.length})</span>
                    </button>
                  </div>

                  <div className="text-[11px] font-mono text-muted-grey">
                    Displaying <span className="text-white font-bold">{filteredCardGames.length}</span> {explorerCategoryTab === 'quickstarter' ? 'quickstarter lines' : explorerCategoryTab === 'main' ? 'main repertoire variations' : 'total variations'}
                  </div>
                </div>
              )}

              {filteredCardGames.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center py-20">
                  <Search className="w-8 h-8 text-muted-grey" />
                  <p className="text-xs font-mono text-muted-grey uppercase tracking-widest">
                    No variations found matching "{explorerSearchQuery}"
                  </p>
                  <button
                    onClick={() => { setExplorerSearchQuery(''); setExplorerResultFilter('ALL'); }}
                    className="text-xs font-mono text-tritium-gold hover:underline"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <div className="space-y-4 pb-24">
                  {paginatedCardGames.map((game) => {
                    const isSelected = selectedGameIds.has(game.id);

                    return (
                      <GlassCard 
                        key={game.id}
                        className={cn(
                          "p-4 md:p-5 border-white/10 hover:border-tritium-gold/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group",
                          isSelected && "border-tritium-gold/60 bg-tritium-gold/[0.03]"
                        )}
                      >
                        {/* Left: Checkbox + Opening Name (White Tag) + Opponent */}
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          {/* Selection Checkbox */}
                          <button
                            onClick={() => toggleSelectGame(game.id)}
                            className="mt-1 text-muted-grey hover:text-white cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-tritium-gold" />
                            ) : (
                              <Square className="w-4 h-4 text-white/30" />
                            )}
                          </button>

                          <div className="space-y-1.5 flex-1 min-w-0">
                            {/* USER DIRECTIVE: ON THOSE PGNS THE WHITE TAG IS THE NAME OF THE OPENING */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-tritium-gold/20 text-tritium-gold border border-tritium-gold/40 tracking-wider">
                                OPENING
                              </span>
                              <h3 className="text-sm font-black text-white tracking-tight truncate">
                                {game.white}
                              </h3>
                              <span className={cn(
                                "text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded",
                                game.result === '1-0' ? "bg-emerald-500/20 text-emerald-400" :
                                game.result === '0-1' ? "bg-rose-500/20 text-rose-400" :
                                game.result === '1/2-1/2' ? "bg-amber-500/20 text-amber-300" :
                                "bg-white/10 text-white/60"
                              )}>
                                {game.result}
                              </span>
                              <span className="text-[9px] font-mono text-muted-grey">
                                {game.moveCount} plies
                              </span>
                            </div>

                            {/* Black Response / Opponent */}
                            <div className="flex items-center gap-2 text-xs font-mono text-muted-grey">
                              <span className="text-white/40 font-bold">VS / BLACK:</span>
                              <span className="text-titanium/90 font-medium">{game.black}</span>
                              {game.event && (
                                <>
                                  <span className="text-white/20">•</span>
                                  <span className="text-white/40 truncate max-w-[200px]">{game.event}</span>
                                </>
                              )}
                            </div>

                            {/* Notation Preview */}
                            <p className="text-[11px] font-mono text-titanium/70 bg-black/40 p-2 rounded border border-white/5 leading-relaxed">
                              {game.preview}
                            </p>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          {/* Train Line */}
                          <button
                            onClick={() => handleTrainSingleLine(game.pgn)}
                            className="px-3 py-2 rounded-lg bg-tritium-gold/15 hover:bg-tritium-gold text-tritium-gold hover:text-void font-mono text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer border border-tritium-gold/30 hover:shadow-[0_0_12px_rgba(212,175,55,0.4)]"
                            title="Train this single variation in Matrix"
                          >
                            <Zap className="w-3 h-3 fill-current" />
                            <span>Train</span>
                          </button>

                          {/* Analyze */}
                          <button
                            onClick={() => {
                              soundEngine.play('move');
                              onAnalyze?.(game.pgn);
                            }}
                            className="px-3 py-2 rounded-lg glass-card border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-white/80 hover:text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                            title="Open in Stockfish Analysis Board"
                          >
                            <Target className="w-3 h-3" />
                            <span>Analyze</span>
                          </button>

                          {/* Copy PGN */}
                          <button
                            onClick={(e) => handleCopyPgn(game.pgn, e)}
                            className="p-2 rounded-lg glass-card border-white/10 hover:border-white/30 text-white/50 hover:text-white transition-colors cursor-pointer"
                            title="Copy PGN notation"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Line */}
                          <button
                            onClick={(e) => promptDeleteSingleLine(game.id, game.white, e)}
                            className="p-2 rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete this line"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </GlassCard>
                    );
                  })}

                  {/* Infinite scroll loading indicator and load more action */}
                  {visibleCount < filteredCardGames.length && (
                    <div className="pt-6 pb-12 flex flex-col items-center justify-center gap-3">
                      <div className="flex items-center gap-2 text-xs font-mono text-muted-grey">
                        <Loader2 className="w-4 h-4 animate-spin text-tritium-gold" />
                        <span>Displaying {Math.min(visibleCount, filteredCardGames.length)} of {filteredCardGames.length} variations (Scroll down to load +30)</span>
                      </div>
                      <button
                        onClick={() => setVisibleCount(v => Math.min(v + DEFAULT_PAGE_SIZE, filteredCardGames.length))}
                        className="px-5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono font-bold text-white transition-all cursor-pointer flex items-center gap-2 shadow-lg"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-tritium-gold" />
                        <span>Load Next 30 Variations</span>
                      </button>
                    </div>
                  )}

                  {filteredCardGames.length > 0 && visibleCount >= filteredCardGames.length && (
                    <div className="pt-6 pb-12 text-center text-xs font-mono text-muted-grey/60 border-t border-white/5">
                      All {filteredCardGames.length} variations loaded
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Progressive Loading Status Bar (USER DIRECTIVE: keep initial load to 30 to prevent lag, load more on scroll) */}
            <div className="p-3 px-6 md:px-8 border-t border-white/5 bg-void/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-muted-grey z-10">
              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  Loaded <span className="text-white font-bold">{Math.min(visibleCount, filteredCardGames.length)}</span> of <span className="text-white font-bold">{filteredCardGames.length}</span> variations
                  <span className="text-muted-grey/60 ml-2 hidden sm:inline">(Auto-loads on scroll)</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {visibleCount < filteredCardGames.length && (
                  <button
                    onClick={() => setVisibleCount(v => Math.min(v + DEFAULT_PAGE_SIZE, filteredCardGames.length))}
                    className="px-3 py-1 rounded glass-card border-white/10 hover:border-tritium-gold/40 text-[11px] font-bold text-tritium-gold hover:bg-tritium-gold/10 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <ChevronDown className="w-3 h-3" />
                    <span>+30 More</span>
                  </button>
                )}

                {visibleCount < filteredCardGames.length && (
                  <button
                    onClick={() => setVisibleCount(filteredCardGames.length)}
                    className="px-3 py-1 rounded glass-card border-white/10 hover:border-white/30 text-[11px] font-medium text-white/70 hover:text-white transition-colors cursor-pointer"
                    title="Load all variations at once"
                  >
                    Load All
                  </button>
                )}

                {visibleCount > DEFAULT_PAGE_SIZE && (
                  <button
                    onClick={() => setVisibleCount(DEFAULT_PAGE_SIZE)}
                    className="px-2.5 py-1 rounded text-[11px] text-muted-grey hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    title="Reset view back to initial 30 variations"
                  >
                    Reset to 30
                  </button>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 3. MODAL: ADD OPENING MANUALLY */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0c10] border border-white/15 rounded-2xl max-w-lg w-full overflow-hidden shadow-[0_0_60px_rgba(212,175,55,0.15)] flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Plus className="w-5 h-5 text-tritium-gold" />
                  <div>
                    <h3 className="font-black text-sm text-white uppercase tracking-tight">Add Variation to Master Card</h3>
                    <p className="text-[10px] font-mono text-muted-grey uppercase">White Tag is the Opening Name</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 text-muted-grey hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Target Master Card Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-tritium-gold">
                    Target Master Card (File Name)
                  </label>
                  <input
                    type="text"
                    value={manualMasterCardName}
                    onChange={(e) => setManualMasterCardName(e.target.value)}
                    placeholder={currentCard ? currentCard.name : "e.g. Sicilian_Defense.pgn"}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-black/60 border border-white/15 text-white font-mono text-xs focus:border-tritium-gold outline-none transition-colors"
                  />
                  <p className="text-[9px] font-mono text-muted-grey">
                    Existing Master Cards or a new card name can be specified.
                  </p>
                </div>

                {/* Opening Name (White Tag) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-white">
                    Opening / Variation Name (White Tag)
                  </label>
                  <input
                    type="text"
                    value={manualOpeningName}
                    onChange={(e) => setManualOpeningName(e.target.value)}
                    placeholder="e.g. Najdorf Variation (6.Bg5)"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-black/60 border border-white/15 text-white font-mono text-xs focus:border-tritium-gold outline-none transition-colors"
                  />
                </div>

                {/* Black / Opponent & Result */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-grey">
                      Black / Defense Tag
                    </label>
                    <input
                      type="text"
                      value={manualBlackPlayer}
                      onChange={(e) => setManualBlackPlayer(e.target.value)}
                      placeholder="e.g. Black Player"
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white font-mono text-xs focus:border-white/30 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-muted-grey">
                      Result
                    </label>
                    <select
                      value={manualResult}
                      onChange={(e) => setManualResult(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white font-mono text-xs focus:border-white/30 outline-none cursor-pointer"
                    >
                      <option value="*">* (Study)</option>
                      <option value="1-0">1-0</option>
                      <option value="0-1">0-1</option>
                      <option value="1/2-1/2">1/2-1/2</option>
                    </select>
                  </div>
                </div>

                {/* Side to Play Toggle */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-grey flex items-center justify-between">
                    <span>Side to Play (Training Perspective)</span>
                    <span className="text-[9px] text-tritium-gold font-normal">
                      {manualSideToPlay === 'b' ? '⚫ Black Repertoire' : manualSideToPlay === 'w' ? '⚪ White Repertoire' : '⚡ Auto-Detect'}
                    </span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setManualSideToPlay('w')}
                      className={cn(
                        "py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer text-xs font-mono font-bold",
                        manualSideToPlay === 'w'
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400"
                          : "bg-black/40 border-white/10 text-white/60 hover:text-white"
                      )}
                    >
                      ⚪ White
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualSideToPlay('b')}
                      className={cn(
                        "py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer text-xs font-mono font-bold",
                        manualSideToPlay === 'b'
                          ? "bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400"
                          : "bg-black/40 border-white/10 text-white/60 hover:text-white"
                      )}
                    >
                      ⚫ Black
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualSideToPlay('auto')}
                      className={cn(
                        "py-2 px-2.5 rounded-lg border text-center transition-all cursor-pointer text-xs font-mono font-bold",
                        manualSideToPlay === 'auto'
                          ? "bg-tritium-gold/20 border-tritium-gold text-tritium-gold ring-1 ring-tritium-gold"
                          : "bg-black/40 border-white/10 text-white/60 hover:text-white"
                      )}
                    >
                      ⚡ Auto
                    </button>
                  </div>
                </div>

                {/* PGN Moves */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-tritium-gold">
                    PGN Notation / Moves
                  </label>
                  <textarea
                    rows={5}
                    value={manualPgnText}
                    onChange={(e) => setManualPgnText(e.target.value)}
                    placeholder="1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6..."
                    className="w-full p-3 rounded-lg bg-black/60 border border-white/15 text-white font-mono text-xs focus:border-tritium-gold outline-none leading-relaxed resize-none"
                  />
                  {manualValidationError && (
                    <p className="text-[10px] font-mono text-rose-400">{manualValidationError}</p>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-white/10 flex items-center justify-end gap-3 bg-black/40">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg glass-card border-white/10 text-white font-mono text-xs hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveManualOpening}
                  className="px-5 py-2 rounded-lg bg-tritium-gold text-void font-black text-xs uppercase tracking-wider hover:bg-white transition-all cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                >
                  Save Variation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. MODAL: + UPLOAD PGN REPERTOIRE (WITH EXPLICIT "SIDE TO PLAY" TOGGLE) */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e1015] border border-white/15 rounded-2xl max-w-xl w-full flex flex-col max-h-[92vh] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-tritium-gold/10 text-tritium-gold border border-tritium-gold/30">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight uppercase">
                      Upload PGN Repertoire
                    </h3>
                    <p className="text-[10px] font-mono text-muted-grey">
                      Batch Ingestion // Multi-Select Files // Perspective Anchor
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-1.5 text-muted-grey hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1 scrollbar-hide">
                
                {/* 1. "SIDE TO PLAY" TOGGLE (WHITE / BLACK / AUTO) */}
                <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-tritium-gold flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-tritium-gold" />
                      <span>Side to Play (Training Perspective)</span>
                    </label>
                    <span className="text-[10px] font-mono text-muted-grey font-bold">
                      {uploadSideToPlay === 'b' ? '⚫ Black Repertoire' : uploadSideToPlay === 'w' ? '⚪ White Repertoire' : '⚡ Auto-Detect'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-muted-grey leading-relaxed">
                    Choose your training perspective. For Black repertoires (such as <strong className="text-amber-300">Anish Giri's Benko Gambit</strong> or <strong className="text-amber-300">Sicilian Najdorf</strong>), explicitly select <strong className="text-amber-300">Black</strong>.
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {/* White Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setUploadSideToPlay('w');
                        soundEngine.play('click');
                      }}
                      className={cn(
                        "py-2.5 px-3 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
                        uploadSideToPlay === 'w'
                          ? "bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400"
                          : "bg-black/40 border-white/10 text-white/60 hover:text-white hover:border-white/20"
                      )}
                    >
                      <div className="w-4 h-4 rounded-full border-2 border-cyan-300 bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider">White</span>
                      <span className="text-[9px] font-mono text-cyan-300/80">Play as 1st</span>
                    </button>

                    {/* Black Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setUploadSideToPlay('b');
                        soundEngine.play('click');
                      }}
                      className={cn(
                        "py-2.5 px-3 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
                        uploadSideToPlay === 'b'
                          ? "bg-amber-500/20 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-amber-400"
                          : "bg-black/40 border-white/10 text-white/60 hover:text-white hover:border-white/20"
                      )}
                    >
                      <div className="w-4 h-4 rounded-full border-2 border-amber-400 bg-zinc-950 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider">Black</span>
                      <span className="text-[9px] font-mono text-amber-300/80">Play as 2nd (e.g. Benko)</span>
                    </button>

                    {/* Auto-Detect Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setUploadSideToPlay('auto');
                        soundEngine.play('click');
                      }}
                      className={cn(
                        "py-2.5 px-3 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
                        uploadSideToPlay === 'auto'
                          ? "bg-tritium-gold/20 border-tritium-gold text-white shadow-[0_0_15px_rgba(212,175,55,0.3)] ring-1 ring-tritium-gold"
                          : "bg-black/40 border-white/10 text-white/60 hover:text-white hover:border-white/20"
                      )}
                    >
                      <Sparkles className="w-4 h-4 text-tritium-gold" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider">Auto-Detect</span>
                      <span className="text-[9px] font-mono text-tritium-gold/80">Tag → FEN → Moves</span>
                    </button>
                  </div>
                </div>

                {/* 2. TABS: BATCH FILES VS PASTE PGN */}
                <div className="space-y-3">
                  <div className="flex border-b border-white/10 text-xs font-mono">
                    <button
                      onClick={() => setUploadTab('files')}
                      className={cn(
                        "pb-2 px-3 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2",
                        uploadTab === 'files'
                          ? "border-tritium-gold text-tritium-gold"
                          : "border-transparent text-muted-grey hover:text-white"
                      )}
                    >
                      <FolderArchive className="w-4 h-4" />
                      <span>Upload Files (Multi-Select)</span>
                    </button>
                    <button
                      onClick={() => setUploadTab('paste')}
                      className={cn(
                        "pb-2 px-3 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2",
                        uploadTab === 'paste'
                          ? "border-tritium-gold text-tritium-gold"
                          : "border-transparent text-muted-grey hover:text-white"
                      )}
                    >
                      <FileCode2 className="w-4 h-4" />
                      <span>Paste PGN Text</span>
                    </button>
                  </div>

                  {uploadTab === 'files' ? (
                    <div className="space-y-3">
                      {/* Drag & Drop Area */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragOver(false);
                          if (e.dataTransfer.files) {
                            setStagedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
                          }
                        }}
                        className={cn(
                          "p-6 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 text-center cursor-pointer relative",
                          isDragOver 
                            ? "border-tritium-gold bg-tritium-gold/10" 
                            : "border-white/15 bg-black/40 hover:border-white/30"
                        )}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pgn,.txt"
                          multiple
                          onChange={(e) => {
                            if (e.target.files) {
                              setStagedFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
                            }
                          }}
                          className="hidden"
                        />
                        <div className="p-3 rounded-full bg-white/5 border border-white/10 text-tritium-gold">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                            Choose PGN Files or Drag & Drop Here
                          </p>
                          <p className="text-[10px] font-mono text-muted-grey mt-1">
                            Supports batch multi-select (1 to 20+ files at once) • Creates 1 Master Card per file
                          </p>
                        </div>
                      </div>

                      {/* Staged files list */}
                      {stagedFiles.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-mono text-muted-grey">
                            <span>Selected Files ({stagedFiles.length})</span>
                            <button
                              onClick={() => setStagedFiles([])}
                              className="text-rose-400 hover:underline cursor-pointer"
                            >
                              Clear All
                            </button>
                          </div>
                          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-hide">
                            {stagedFiles.map((file, i) => (
                              <div
                                key={`${file.name}-${i}`}
                                className="flex items-center justify-between p-2 rounded-lg bg-black/50 border border-white/10 text-xs font-mono"
                              >
                                <div className="flex items-center gap-2 truncate flex-1 mr-2">
                                  <FileCode2 className="w-3.5 h-3.5 text-tritium-gold shrink-0" />
                                  <span className="text-white truncate">{file.name}</span>
                                  <span className="text-muted-grey text-[10px] shrink-0">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                  </span>
                                </div>
                                <button
                                  onClick={() => setStagedFiles(prev => prev.filter((_, idx) => idx !== i))}
                                  className="text-white/40 hover:text-rose-400 p-1 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-grey">
                          Master Card Name
                        </label>
                        <input
                          type="text"
                          value={uploadPastedName}
                          onChange={(e) => setUploadPastedName(e.target.value)}
                          placeholder="e.g. Benko_Gambit_Anish_Giri.pgn"
                          className="w-full px-3.5 py-2.5 rounded-lg bg-black/60 border border-white/15 text-white font-mono text-xs focus:border-tritium-gold outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-grey">
                          PGN Movetext
                        </label>
                        <textarea
                          rows={6}
                          value={uploadPastedPgn}
                          onChange={(e) => setUploadPastedPgn(e.target.value)}
                          placeholder="Paste single or multiple PGN games here..."
                          className="w-full p-3 rounded-lg bg-black/60 border border-white/15 text-white font-mono text-xs focus:border-tritium-gold outline-none leading-relaxed resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10 flex items-center justify-between gap-3 bg-black/40">
                <div className="text-[11px] font-mono text-muted-grey">
                  Perspective: <span className={cn("font-bold uppercase", uploadSideToPlay === 'b' ? 'text-amber-300' : uploadSideToPlay === 'w' ? 'text-cyan-300' : 'text-tritium-gold')}>{uploadSideToPlay === 'b' ? 'Black' : uploadSideToPlay === 'w' ? 'White' : 'Auto-Detect'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 rounded-lg glass-card border-white/10 text-white font-mono text-xs hover:bg-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadModalSubmit}
                    disabled={isProcessing || (uploadTab === 'files' ? stagedFiles.length === 0 : !uploadPastedPgn.trim())}
                    className={cn(
                      "px-5 py-2 rounded-lg bg-tritium-gold text-void font-black text-xs uppercase tracking-wider hover:bg-white transition-all cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.3)]",
                      (isProcessing || (uploadTab === 'files' ? stagedFiles.length === 0 : !uploadPastedPgn.trim())) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isProcessing ? 'Ingesting...' : 'Ingest Repertoire'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. MODAL: CONFIRM ACTION */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e1015] border border-white/15 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            >
              <h3 className="text-base font-black text-white uppercase tracking-tight">{confirmModal.title}</h3>
              <p className="text-xs font-mono text-muted-grey leading-relaxed">{confirmModal.message}</p>
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-lg glass-card border-white/10 text-white font-mono text-xs hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-mono font-bold text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                >
                  {confirmModal.confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
