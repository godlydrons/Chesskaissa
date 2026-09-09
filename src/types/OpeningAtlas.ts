export interface AtlasMoveNode {
  id: string;             // Unique identifier e.g. "root", "e4", "e4_e5", "e4_e5_Nf3"
  san: string;            // Short algebraic notation e.g. "e4", "Nf3", "Bb5"
  moveNumber: number;     // e.g. 1, 2, 3
  isWhite: boolean;       // White move or Black move
  fen: string;            // Resulting FEN
  name: string;           // Street / Landmark / District name
  eco?: string;           // ECO code e.g. "C60", "B90"
  description?: string;   // Historical / Tactical briefing
  frequency?: number;     // Master game frequency (popularity weighting)
  winRateWhite?: number;  // e.g. 38%
  winRateDraw?: number;   // e.g. 32%
  winRateBlack?: number;  // e.g. 30%
  worldX: number;         // Manhattan grid X in city space
  worldY: number;         // Manhattan grid Y in city space
  streetType: 'HIGHWAY' | 'AVENUE' | 'BOULEVARD' | 'STREET' | 'ALLEY' | 'PLAZA' | 'BRIDGE';
  children: AtlasMoveNode[];
}

export interface OpeningCityTerritory {
  id: string;             // e.g. "ruy-lopez"
  name: string;           // e.g. "Ruy Lopez City"
  country: string;        // e.g. "Spanish Empire (1.e4 e5)"
  continentId: 'kings-pawn' | 'queens-pawn' | 'flank-ocean' | 'indian-plains';
  continentName: string;  // e.g. "King's Pawn Continent (1.e4)"
  startMoves: string;     // e.g. "1.e4 e5 2.Nf3 Nc6 3.Bb5"
  rootFen: string;
  eco: string;
  colorTheme: string;     // Neon accent color for city roads (e.g. "#00f0ff", "#fbbf24", "#f43f5e")
  coordinates: { x: number; y: number }; // Global world map coordinates (0-1000)
  statesCount: number;
  variationCount: number;
  description: string;
  keyDistricts: {
    id: string;
    name: string;
    moves: string;
    color: string;
    x: number;
    y: number;
  }[];
  rootNode: AtlasMoveNode;
}

export interface AtlasContinent {
  id: string;
  name: string;
  code: string;           // e.g. "1.e4", "1.d4", "1.c4 / 1.Nf3", "Irregular"
  description: string;
  color: string;
  mapBounds: { x: number; y: number; width: number; height: number };
  cities: string[];       // Territory IDs
}
