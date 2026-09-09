// High-Fidelity Cartography Engine: Fictional Alien Exoplanet "Caissa Planitia"
// Hand-engineered vector landmasses for the Dual-Hemisphere Chess World:
// - Western Hemisphere: 1.e4 King's Dominion (Radiant Cyan / Teal Glow)
// - Eastern Hemisphere: 1.d4 Queen's Realm (Warm Amber / Gold Glow)
// - Central Abyss: Ocean of Variations (Obsidian Ocean with Bathymetric Trenches)
// - Southern Expanse: The Hypermodern Isles / Flank Archipelago (Neon Violet / Indigo)

export const WORLD_WIDTH = 8000;
export const WORLD_HEIGHT = 8000;

export interface TerritoryZone {
  id: string;
  name: string;
  eco: string;
  worldX: number;
  worldY: number;
  color: string;
  continentId: 'e4' | 'd4' | 'flank';
  subDistricts: string[];
}

export interface CityCluster {
  id: string;
  name: string;
  tag: string;
  worldX: number;
  worldY: number;
  color: string;
  primarySan: string;
  lights: Array<{ dx: number; dy: number; r: number; intensity: number; color: string }>;
}

export interface LandmassPolygon {
  id: string;
  name: string;
  hemisphere: 'western_e4' | 'eastern_d4' | 'oceanic_flank';
  glowColor: string;
  baseColor: string;
  coastColor: string;
  points: [number, number][];
  interiorRidges?: [number, number][][];
}

export interface TranspositionDataLane {
  id: string;
  name: string;
  description: string;
  sourceHubId: string;
  targetHubId: string;
  source: [number, number];
  target: [number, number];
  controlPoint1: [number, number];
  controlPoint2: [number, number];
  color: string;
  transpositionEco: string;
}

// Helper to generate organic scatter of city satellite lights
function generateClusterLights(
  count: number,
  spread: number,
  colorA: string,
  colorB: string
): Array<{ dx: number; dy: number; r: number; intensity: number; color: string }> {
  const lights: Array<{ dx: number; dy: number; r: number; intensity: number; color: string }> = [
    // Bright central nucleus
    { dx: 0, dy: 0, r: 9, intensity: 1.0, color: '#ffffff' },
    { dx: 5, dy: -6, r: 7, intensity: 0.95, color: colorA },
    { dx: -7, dy: 7, r: 7, intensity: 0.9, color: colorB },
  ];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.pow(Math.random(), 1.6) * spread;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const r = Math.max(2, 6 - (dist / spread) * 4 + Math.random() * 2.5);
    const intensity = Math.max(0.35, 1.0 - (dist / spread) * 0.65);
    const color = Math.random() > 0.4 ? colorA : colorB;
    lights.push({ dx, dy, r, intensity, color });
  }
  return lights;
}

/**
 * Hand-Engineered Alien Supercontinents for "Caissa Planitia"
 * Defined from scratch with high-density jagged vector path coordinates.
 */
export const CAISSA_LANDMASSES: LandmassPolygon[] = [
  // =========================================================================
  // 1. WESTERN SUPERCONTINENT: "1.e4 KING'S DOMINION"
  // Radiant Cyan / Teal Glow, Jagged Western Landmass
  // =========================================================================
  {
    id: 'continent-kings-dominion',
    name: "King's Dominion (1.e4 Western Supercontinent)",
    hemisphere: 'western_e4',
    glowColor: '#00f0ff',
    baseColor: '#061a23',
    coastColor: '#22d3ee',
    points: [
      // Northern Cape & Scandinavian Promontory
      [2200, 1150], [2450, 1050], [2750, 1120], [2980, 1280], [3200, 1400],
      // North-Eastern Fjord Coastline
      [3380, 1550], [3280, 1680], [3420, 1820],
      // The Ruy Lopez Peninsula (jutting eastward towards the Ocean of Variations)
      [3620, 1920], [3820, 2020], [3760, 2180], [3540, 2220],
      // Italian Coast & Giuoco Bay
      [3460, 2350], [3320, 2480], [3400, 2650], [3300, 2800],
      // French Enclave & Isthmus
      [3100, 2920], [2850, 2850], [2700, 3100], [2550, 3350],
      // Southern King's Gambit Peninsula & Volcanic Reaches
      [2680, 3600], [2540, 3900], [2380, 4150], [2150, 4200], [1950, 4050],
      // Sicilian Deep Gulf & South-Western Estuary
      [1800, 3820], [1650, 3600], [1820, 3400], [1720, 3200],
      // Caro-Kann Western Shoreline
      [1580, 2950], [1420, 2700], [1500, 2450], [1380, 2250],
      // Alekhine Western Horn
      [1480, 1980], [1620, 1750], [1540, 1550], [1750, 1400], [1980, 1300]
    ],
    interiorRidges: [
      // Major Tectonic Tension Ridge (Morphy Mountain Spine)
      [[2200, 1400], [2450, 1700], [2750, 1950], [3150, 2050], [3500, 2100]],
      // Sicilian Fault Line
      [[1750, 3400], [2100, 3100], [2450, 2700], [2800, 2450]],
      // French Shield Ridge
      [[2250, 2300], [2500, 2600], [2700, 2900]],
    ]
  },

  // King's Dominion Satellite Isle: The Sicilian Offshore Crescent
  {
    id: 'isle-sicilian-crescent',
    name: 'Sicilian Offshore Crescent (Dragon Strip)',
    hemisphere: 'western_e4',
    glowColor: '#10b981',
    baseColor: '#052119',
    coastColor: '#34d399',
    points: [
      [2850, 1680], [3050, 1620], [3200, 1700], [3180, 1800],
      [3000, 1840], [2880, 1780]
    ]
  },

  // =========================================================================
  // 2. EASTERN SUPERCONTINENT: "1.d4 QUEEN'S REALM"
  // Warm Amber / Gold Glow, Jagged Continental Imperium
  // =========================================================================
  {
    id: 'continent-queens-realm',
    name: "Queen's Realm (1.d4 Eastern Supercontinent)",
    hemisphere: 'eastern_d4',
    glowColor: '#f59e0b',
    baseColor: '#241604',
    coastColor: '#fbbf24',
    points: [
      // Northern Dutch & Catalan Promontory
      [5200, 1100], [5500, 1020], [5850, 1140], [6180, 1250],
      // North-Eastern Nimzo Shield
      [6450, 1400], [6700, 1600], [6600, 1800], [6850, 1950],
      // King's Indian & Grünfeld Eastern Horn (Extending Eastward)
      [7150, 2100], [7300, 2350], [7150, 2550], [6850, 2600],
      // Slav & Semi-Slav Southern Plateau
      [6650, 2800], [6500, 3050], [6620, 3300], [6480, 3600],
      // Benoni Wastelands
      [6250, 3850], [5950, 4050], [5700, 4150], [5450, 3980],
      // Tartakower Bay & Southern Gulf
      [5300, 3750], [5420, 3500], [5280, 3250], [5120, 3000],
      // Queen's Gambit Great Inward Harbor (facing the Ocean of Variations)
      [4950, 2750], [4820, 2500], [4650, 2300], [4550, 2050],
      // Western Catalonian Cliffs
      [4680, 1850], [4800, 1620], [4720, 1450], [4950, 1300]
    ],
    interiorRidges: [
      // The Great Slav Escarpment
      [[5000, 1500], [5300, 1800], [5650, 2050], [6100, 2300], [6700, 2450]],
      // King's Indian Canyon Fault
      [[5500, 2200], [5900, 2500], [6300, 2800], [6550, 3200]],
      // Catalan Golden Ridge
      [[4850, 1600], [5200, 1750], [5550, 1650]],
    ]
  },

  // Queen's Realm Offshore Isle: The Nimzo-Indian Atoll
  {
    id: 'isle-nimzo-atoll',
    name: 'Nimzo-Indian Outer Archipelago',
    hemisphere: 'eastern_d4',
    glowColor: '#eab308',
    baseColor: '#201904',
    coastColor: '#facc15',
    points: [
      [4750, 2050], [4900, 1980], [5000, 2060], [4950, 2180],
      [4800, 2220], [4720, 2140]
    ]
  },

  // =========================================================================
  // 3. SOUTHERN ARCHIPELAGO: "THE HYPERMODERN ISLES"
  // Neon Violet / Indigo Glow, Oceanic Flank Cluster
  // =========================================================================
  {
    id: 'continent-hypermodern-isles',
    name: 'The Hypermodern Isles (Flank Archipelago)',
    hemisphere: 'oceanic_flank',
    glowColor: '#a855f7',
    baseColor: '#170c2a',
    coastColor: '#c084fc',
    points: [
      // English Grand Isle
      [3600, 5200], [3900, 5050], [4250, 5150], [4450, 5350],
      // Reti Sound
      [4650, 5550], [4800, 5800], [4650, 6050], [4400, 6150],
      // King's Indian Attack Reefs
      [4200, 6350], [3950, 6450], [3700, 6300], [3500, 6100],
      // Bird's Western Shelf
      [3400, 5800], [3350, 5550], [3450, 5350]
    ],
    interiorRidges: [
      [[3650, 5400], [4000, 5500], [4350, 5650], [4600, 5850]],
    ]
  },

  // Double Fianchetto Outlier Island
  {
    id: 'isle-larsen-outpost',
    name: 'Larsen & Double Fianchetto Spire',
    hemisphere: 'oceanic_flank',
    glowColor: '#818cf8',
    baseColor: '#101230',
    coastColor: '#a5b4fc',
    points: [
      [4850, 6300], [5050, 6200], [5200, 6320], [5150, 6450],
      [4980, 6500], [4860, 6420]
    ]
  }
];

/**
 * Strategic Hub Capitals Pinned at Fixed World-Space Coordinates
 */
export const CITY_CLUSTERS: CityCluster[] = [
  // ---------------- Western 1.e4 King's Dominion ----------------
  {
    id: 'anchor-e4-capital',
    name: "1.e4 King's Dominion Prime",
    tag: '1.e4',
    worldX: 2500,
    worldY: 2000,
    color: '#00f0ff',
    primarySan: 'e4',
    lights: generateClusterLights(38, 130, '#00f0ff', '#38bdf8'),
  },
  {
    id: 'ruy-lopez-city',
    name: 'Ruy Lopez Metro (Spanish Capital)',
    tag: '1.e4 e5 2.Nf3 Nc6 3.Bb5',
    worldX: 3060,
    worldY: 2000,
    color: '#06b6d4',
    primarySan: 'Bb5',
    lights: generateClusterLights(32, 95, '#22d3ee', '#00f0ff'),
  },
  {
    id: 'italian-game-city',
    name: 'Italian Citadel (Giuoco Fortress)',
    tag: '1.e4 e5 2.Nf3 Nc6 3.Bc4',
    worldX: 3060,
    worldY: 2140,
    color: '#38bdf8',
    primarySan: 'Bc4',
    lights: generateClusterLights(28, 85, '#38bdf8', '#0ea5e9'),
  },
  {
    id: 'sicilian-metropolis',
    name: 'Sicilian Metropolis (Najdorf / Dragon Strip)',
    tag: '1.e4 c5',
    worldX: 2780,
    worldY: 1860,
    color: '#10b981',
    primarySan: 'c5',
    lights: generateClusterLights(34, 110, '#34d399', '#10b981'),
  },
  {
    id: 'french-defense-port',
    name: 'French Defense Enclave (Winawer Bay)',
    tag: '1.e4 e6',
    worldX: 2500,
    worldY: 2460,
    color: '#14b8a6',
    primarySan: 'e6',
    lights: generateClusterLights(26, 80, '#2dd4bf', '#0d9488'),
  },
  {
    id: 'caro-kann-shores',
    name: 'Caro-Kann Bastion (Advance Peninsula)',
    tag: '1.e4 c6',
    worldX: 2360,
    worldY: 2000,
    color: '#4ade80',
    primarySan: 'c6',
    lights: generateClusterLights(24, 75, '#4ade80', '#22c55e'),
  },

  // ---------------- Eastern 1.d4 Queen's Realm ----------------
  {
    id: 'anchor-d4-capital',
    name: "1.d4 Queen's Realm Prime",
    tag: '1.d4',
    worldX: 5500,
    worldY: 2000,
    color: '#f59e0b',
    primarySan: 'd4',
    lights: generateClusterLights(38, 130, '#fbbf24', '#f59e0b'),
  },
  {
    id: 'queens-gambit-capital',
    name: "Queen's Gambit Heartland",
    tag: '1.d4 d5 2.c4',
    worldX: 5220,
    worldY: 2000,
    color: '#f59e0b',
    primarySan: 'c4',
    lights: generateClusterLights(32, 100, '#fbbf24', '#f59e0b'),
  },
  {
    id: 'slav-defense-citadel',
    name: 'Slav Defense Citadel (Meran Bastion)',
    tag: '1.d4 d5 2.c4 c6',
    worldX: 5220,
    worldY: 2140,
    color: '#f97316',
    primarySan: 'c6',
    lights: generateClusterLights(28, 88, '#fb923c', '#ea580c'),
  },
  {
    id: 'kings-indian-citadel',
    name: "King's Indian & Grünfeld Ridge",
    tag: '1.d4 Nf6 2.c4 g6',
    worldX: 5640,
    worldY: 2150,
    color: '#fb923c',
    primarySan: 'g6',
    lights: generateClusterLights(30, 95, '#fdba74', '#ea580c'),
  },
  {
    id: 'nimzo-indian-enclave',
    name: 'Nimzo-Indian Sanctuary (Classical Enclave)',
    tag: '1.d4 Nf6 2.c4 e6 3.Nc3 Bb4',
    worldX: 5500,
    worldY: 1850,
    color: '#eab308',
    primarySan: 'Bb4',
    lights: generateClusterLights(24, 75, '#facc15', '#ca8a04'),
  },

  // ---------------- Southern Flank & Hypermodern Isles ----------------
  {
    id: 'anchor-flank-capital',
    name: 'Hypermodern Prime (Flank Capital)',
    tag: 'Flank',
    worldX: 4000,
    worldY: 5500,
    color: '#a855f7',
    primarySan: 'Flank',
    lights: generateClusterLights(36, 120, '#c084fc', '#818cf8'),
  },
  {
    id: 'english-atoll-port',
    name: 'English Opening Archipelago',
    tag: '1.c4',
    worldX: 3850,
    worldY: 5400,
    color: '#818cf8',
    primarySan: 'c4',
    lights: generateClusterLights(28, 85, '#a5b4fc', '#6366f1'),
  },
  {
    id: 'reti-system-haven',
    name: 'Reti & Double Fianchetto Haven',
    tag: '1.Nf3 d5 2.c4',
    worldX: 4150,
    worldY: 5600,
    color: '#38bdf8',
    primarySan: 'Nf3',
    lights: generateClusterLights(26, 80, '#7dd3fc', '#0284c7'),
  },
];

/**
 * Theoretical Transposition Data-Lanes
 * Glowing vector routes crossing oceanic trenches connecting distant opening structures.
 */
export const TRANSPOSITION_DATA_LANES: TranspositionDataLane[] = [
  // 1. Transatlantic Transposition Lane: Ruy Lopez <-> Queen's Gambit
  {
    id: 'lane-ruy-qg',
    name: 'Classical Grand Transposition Lane',
    description: 'Bridges Open Game King structures with Closed Queen Gambit systems',
    sourceHubId: 'ruy-lopez-city',
    targetHubId: 'queens-gambit-capital',
    source: [3060, 2000],
    target: [5220, 2000],
    controlPoint1: [3750, 1500],
    controlPoint2: [4500, 1500],
    color: '#38bdf8',
    transpositionEco: 'C60 ↔ D30',
  },
  // 2. Anglo-Sicilian Oceanic Lane: Sicilian Metropolis <-> English Opening
  {
    id: 'lane-sicilian-english',
    name: 'Anglo-Sicilian Inverted Bridge',
    description: '1.c4 e5 inverted Sicilian & Symmetrical 1... c5 lines',
    sourceHubId: 'sicilian-metropolis',
    targetHubId: 'english-atoll-port',
    source: [2780, 1860],
    target: [3850, 5400],
    controlPoint1: [2900, 3500],
    controlPoint2: [3400, 4800],
    color: '#10b981',
    transpositionEco: 'B20 ↔ A20',
  },
  // 3. Slav-Caro Coastal Trench: Caro-Kann <-> Slav Defense
  {
    id: 'lane-caro-slav',
    name: 'Slav-Caro Pawn Structure Trench',
    description: 'Pawn triangle c6/d5 mutual transposition matrix',
    sourceHubId: 'caro-kann-shores',
    targetHubId: 'slav-defense-citadel',
    source: [2360, 2000],
    target: [5220, 2140],
    controlPoint1: [3200, 2400],
    controlPoint2: [4400, 2500],
    color: '#4ade80',
    transpositionEco: 'B12 ↔ D10',
  },
  // 4. French-QGD Subduction Rift: French Defense <-> Queen's Gambit Heartland
  {
    id: 'lane-french-qgd',
    name: 'French to QGD Steinitz Rift',
    description: '1.d4 e6 2.e4 d5 or 1.d4 d5 2.c4 e6 3.Nc3 c5',
    sourceHubId: 'french-defense-port',
    targetHubId: 'queens-gambit-capital',
    source: [2500, 2460],
    target: [5220, 2000],
    controlPoint1: [3500, 2900],
    controlPoint2: [4500, 2700],
    color: '#2dd4bf',
    transpositionEco: 'C00 ↔ D31',
  },
  // 5. King\'s Indian to Reti/KIA Archipelago Lane
  {
    id: 'lane-kid-reti',
    name: 'Hypermodern Fianchetto Corridor',
    description: "King's Indian Attack (KIA) & Double Fianchetto transposition highway",
    sourceHubId: 'kings-indian-citadel',
    targetHubId: 'reti-system-haven',
    source: [5640, 2150],
    target: [4150, 5600],
    controlPoint1: [5300, 3600],
    controlPoint2: [4600, 4800],
    color: '#fb923c',
    transpositionEco: 'E60 ↔ A07',
  },
];

// Territory Zones for regional HUD and tactical labels
export const TERRITORY_ZONES: TerritoryZone[] = [
  {
    id: 'zone-ruy-lopez',
    name: 'Ruy Lopez Domain (Caissa West)',
    eco: 'C60-C99',
    worldX: 3060,
    worldY: 2000,
    color: '#00f0ff',
    continentId: 'e4',
    subDistricts: ['Morphy Defense', 'Berlin Wall', 'Marshall Attack', 'Exchange Sector'],
  },
  {
    id: 'zone-italian',
    name: 'Italian Game Province',
    eco: 'C50-C59',
    worldX: 3060,
    worldY: 2140,
    color: '#38bdf8',
    continentId: 'e4',
    subDistricts: ['Giuoco Piano', 'Two Knights Valley', 'Evans Gambit Bay'],
  },
  {
    id: 'zone-sicilian',
    name: 'Sicilian Defense Sector',
    eco: 'B20-B99',
    worldX: 2780,
    worldY: 1860,
    color: '#10b981',
    continentId: 'e4',
    subDistricts: ['Najdorf District', 'Dragon Strip', 'Sveshnikov Boulevard', 'Alapin Quarter'],
  },
  {
    id: 'zone-french-caro',
    name: 'French & Semi-Open Enclave',
    eco: 'C00-B19',
    worldX: 2500,
    worldY: 2460,
    color: '#2dd4bf',
    continentId: 'e4',
    subDistricts: ['Winawer Harbor', 'Advance Redoubt', 'Classical Shore'],
  },
  {
    id: 'zone-queens-gambit',
    name: "Queen's Gambit Realm (Caissa East)",
    eco: 'D00-D69',
    worldX: 5220,
    worldY: 2000,
    color: '#fbbf24',
    continentId: 'd4',
    subDistricts: ['Tartakower Sector', 'Albin Counter', 'Exchange Quarter', 'Catalan Ridge'],
  },
  {
    id: 'zone-slav',
    name: 'Slav Defense Heartland',
    eco: 'D10-D19',
    worldX: 5220,
    worldY: 2140,
    color: '#f97316',
    continentId: 'd4',
    subDistricts: ['Semi-Slav District', 'Meran Quarter', 'Chebanenko Avenue'],
  },
  {
    id: 'zone-indian-complex',
    name: "King's Indian & Grünfeld Complex",
    eco: 'E60-E99',
    worldX: 5640,
    worldY: 2150,
    color: '#fb923c',
    continentId: 'd4',
    subDistricts: ['Mar del Plata', 'Grünfeld Canyon', 'Nimzo Enclave', "King's Indian Fortress"],
  },
  {
    id: 'zone-flank-isles',
    name: 'The Hypermodern Isles',
    eco: 'A00-A39',
    worldX: 4000,
    worldY: 5500,
    color: '#818cf8',
    continentId: 'flank',
    subDistricts: ['English Opening', 'Reti Lagoon', "King's Indian Attack", 'Double Fianchetto'],
  },
];

