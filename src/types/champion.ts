export type ChampionId = 'kasparov' | 'tal' | 'karpov' | 'fischer' | 'morphy';

export type CognitiveEngineState = 
  | 'AUTO_PLAY' 
  | 'HALTED_CRITICAL' 
  | 'EVALUATING_GUESS' 
  | 'PUNISHMENT_BRANCH' 
  | 'SUCCESS_REVELATION';

export interface CachedRefutation {
  blunderSan: string;
  blunderTitle: string;
  punishmentSequence: string[]; // 2-4 plies of forcing punishment moves (e.g. ["Rxd6", "exd6", "Nd7"])
  refutationNarration: string;   // Spoken and displayed refutation
}

/**
 * Granular Detail Record (champion_moments)
 * Relational detail linked to champion_games
 */
export interface ChampionMomentRecord {
  id: string;
  gameId: string;
  plyNumber: number;            // Exact half-move index where the game halts (0-indexed before move or 1-indexed)
  moveNumber: number;           // Move number e.g. 24
  turn: 'w' | 'b';
  fenBefore: string;            // Board state prior to the critical move
  championMoveSan: string;      // The canonical move executed by the master e.g. "Rxd4"
  championMoveUci?: string;     // e.g. "d1d4"
  preMoveFraming: string;       // High-level strategic briefing setting the board tension before user acts
  structuralRevelation: string; // Deep instructional explanation revealed ONLY after correct move is played
  cachedRefutations: CachedRefutation[]; // Top 2-3 intuitive human mistakes with 2-4 ply punishments
  highlightSquares?: string[];
  arrows?: [string, string, string?][];
}

/**
 * Master Record (champion_games)
 * Clean relational master table without monolithic JSON blobs
 */
export interface ChampionGameRecord {
  id: string;
  championId: ChampionId;
  championName: string;         // e.g. "Garry Kasparov", "Mikhail Tal"
  stylisticDogma: string;       // e.g. "Dynamic Imbalances", "Intuitive Sacrifices", "Suffocating Prophylaxis"
  openingIntent: string;        // Strategic rationale explaining why champion weaponized this system
  totalCriticalMoments: number; // Aggregate integer count of halts
  pgnContent: string;           // Sanitized master PGN string
  championColor: 'w' | 'b';
  moments: ChampionMomentRecord[];
}

export interface ChampionDna {
  initiative: number;
  tactics: number;
  prophylaxis: number;
  dynamism: number;
  endgame: number;
}

export interface ChampionPersona {
  id: ChampionId;
  name: string;
  epithet: string;
  title: string;
  reign: string;
  stylisticDogma: string;
  voiceProfile: {
    pitch: number;
    rate: number;
    voiceNamePrefix?: string;
  };
  quote: string;
  dna: ChampionDna;
}

export interface UserCognitiveStats {
  gameId: string;
  momentsEncountered: number;
  momentsSolvedFirstTry: number;
  punishmentBranchesTriggered: number;
  alignmentScore: number;
}

// Backward-compatibility aliases
export type StyleTag = 'CHAMPION' | 'PASSIVE' | 'MATERIALISTIC' | 'CAUTIOUS' | 'ENGINE';

export interface StyleAlternative {
  moveSan: string;
  styleTag: StyleTag;
  title: string;
  feedback: string;
}

export interface StyleMoment {
  id: string;
  ply: number;
  moveNumber: number;
  turn: 'w' | 'b';
  fen: string;
  prompt: string;
  context: string;
  championMoveSan: string;
  championMoveUci?: string;
  championPhilosophy: string;
  tacticalTheme: string;
  alternatives: StyleAlternative[];
  highlightSquares?: string[];
  arrows?: [string, string, string?][];
}

export interface MoveAnnotation {
  ply: number;
  san: string;
  fen?: string;
  headline?: string;
  commentary: string;
  styleTip?: string;
  arrows?: [string, string, string?][];
  highlightSquares?: string[];
}

export interface ChampionGame extends ChampionGameRecord {
  title?: string;
  subtitle?: string;
  white?: string;
  black?: string;
  event?: string;
  year?: number;
  result?: string;
  eco?: string;
  pgn?: string;
  heroQuote?: string;
  keyThemes?: string[];
  overview?: string;
  styleMoments?: StyleMoment[];
  annotations?: Record<number, MoveAnnotation>;
}

export interface ChampionProfile extends ChampionPersona {
  tagline?: string;
  archetypeDescription?: string;
  signatureWeapon?: string;
  games?: ChampionGame[];
}
