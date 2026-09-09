// Manhattan Orthogonal Street Grid Generator for Caissa Cartography Engine
// Coordinates specified:
// - 1.e4 openings rooted at (2500, 2000)
// - 1.d4 openings rooted at (5500, 2000)
// - Flank openings rooted at (4000, 5500)

export interface StreetNode {
  id: string;
  cityId: string;
  fen: string;
  san: string;
  name: string;
  depth: number;
  worldX: number;
  worldY: number;
  parentFen: string | null;
  childrenIds: string[];
}

export interface StreetEdge {
  id: string;
  sourceId: string;
  targetId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  moveSan: string;
}

export interface CityStreetNetwork {
  nodes: StreetNode[];
  edges: StreetEdge[];
  nodeMap: Map<string, StreetNode>;
}

export function buildAllWorldStreetNetworks(): CityStreetNetwork {
  const nodes: StreetNode[] = [];
  const edges: StreetEdge[] = [];
  const nodeMap = new Map<string, StreetNode>();

  const addBranch = (
    cityId: string,
    spec: {
      san: string;
      name: string;
      fen: string;
      parentFen: string | null;
      x: number;
      y: number;
      depth: number;
      children?: any[];
    }
  ): string => {
    const wx = Math.round(spec.x);
    const wy = Math.round(spec.y);
    const id = `${cityId}-${spec.san}-${wx}_${wy}`;
    const streetNode: StreetNode = {
      id,
      cityId,
      fen: spec.fen,
      san: spec.san,
      name: spec.name,
      depth: spec.depth,
      worldX: wx,
      worldY: wy,
      parentFen: spec.parentFen,
      childrenIds: [],
    };
    nodes.push(streetNode);
    nodeMap.set(id, streetNode);
    nodeMap.set(spec.fen, streetNode);

    if (spec.children && spec.children.length > 0) {
      for (const child of spec.children) {
        const cwx = Math.round(child.x);
        const cwy = Math.round(child.y);
        const childId = addBranch(cityId, {
          ...child,
          parentFen: spec.fen,
          depth: spec.depth + 1,
        });
        streetNode.childrenIds.push(childId);

        edges.push({
          id: `${id}->${childId}`,
          sourceId: id,
          targetId: childId,
          x1: wx,
          y1: wy,
          x2: cwx,
          y2: cwy,
          moveSan: child.san,
        });
      }
    }

    return id;
  };

  // =========================================================================
  // 1. 1.e4 OPENING TREE (Rooted exactly at 2500, 2000)
  // =========================================================================
  addBranch('continent-e4', {
    san: '1. e4',
    name: "King's Pawn Entry Highway (1.e4 Origin)",
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    parentFen: null,
    x: 2500,
    y: 2000,
    depth: 1,
    children: [
      // 1.1 OPEN GAMES (1... e5) -> Ruy Lopez, Italian, Scotch
      {
        san: 'e5',
        name: 'Open Game Concourse (1... e5)',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        x: 2640,
        y: 2000,
        children: [
          {
            san: 'Nf3',
            name: "King's Knight Avenue (2. Nf3)",
            fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
            x: 2780,
            y: 2000,
            children: [
              {
                san: 'Nc6',
                name: 'Main Defense Junction (2... Nc6)',
                fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
                x: 2920,
                y: 2000,
                children: [
                  // RUY LOPEZ (3. Bb5)
                  {
                    san: 'Bb5',
                    name: 'Spanish Bishop Square (Ruy Lopez 3. Bb5)',
                    fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
                    x: 3060,
                    y: 2000,
                    children: [
                      // Morphy Defense (3... a6)
                      {
                        san: 'a6',
                        name: 'Morphy Defense Avenue (3... a6)',
                        fen: 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
                        x: 3060,
                        y: 1870,
                        children: [
                          {
                            san: 'Ba4',
                            name: 'Retreat Boulevard (4. Ba4)',
                            fen: 'r1bqkbnr/1ppp1ppp/p1n5/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 1 4',
                            x: 3200,
                            y: 1870,
                            children: [
                              {
                                san: 'Nf6',
                                name: 'Chigorin Cross (4... Nf6)',
                                fen: 'r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 5',
                                x: 3340,
                                y: 1870,
                                children: [
                                  {
                                    san: 'O-O',
                                    name: 'Imperial Castle District (5. O-O)',
                                    fen: 'r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 3 5',
                                    x: 3480,
                                    y: 1870,
                                    children: [
                                      {
                                        san: 'Be7',
                                        name: 'Closed Defense Terminal (5... Be7)',
                                        fen: 'r1bqk2r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 6',
                                        x: 3620,
                                        y: 1870,
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                          {
                            san: 'Bxc6',
                            name: 'Exchange Variation Pier (4. Bxc6)',
                            fen: 'r1bqkbnr/1ppp1ppp/p1B5/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4',
                            x: 3060,
                            y: 1730,
                            children: [
                              {
                                san: 'dxc6',
                                name: 'Endgame Plaza (4... dxc6)',
                                fen: 'r1bqkbnr/1pp2ppp/p1p5/4p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5',
                                x: 3200,
                                y: 1730,
                              },
                            ],
                          },
                        ],
                      },
                      // Berlin Defense (3... Nf6)
                      {
                        san: 'Nf6',
                        name: 'Berlin Defense Wall (3... Nf6)',
                        fen: 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
                        x: 3060,
                        y: 2140,
                        children: [
                          {
                            san: 'O-O',
                            name: 'Berlin Endgame Highway (4. O-O)',
                            fen: 'r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4',
                            x: 3200,
                            y: 2140,
                            children: [
                              {
                                san: 'Nxe4',
                                name: 'Open Files Plaza (4... Nxe4)',
                                fen: 'r1bqkb1r/pppp1ppp/2n5/1B2p3/4n3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 0 5',
                                x: 3340,
                                y: 2140,
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  // ITALIAN GAME (3. Bc4)
                  {
                    san: 'Bc4',
                    name: 'Italian Game Province (3. Bc4)',
                    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
                    x: 2920,
                    y: 1870,
                    children: [
                      {
                        san: 'Bc5',
                        name: 'Giuoco Piano Way (3... Bc5)',
                        fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
                        x: 2920,
                        y: 1730,
                        children: [
                          {
                            san: 'c3',
                            name: 'Main Italian Center (4. c3)',
                            fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R b KQkq - 0 4',
                            x: 3060,
                            y: 1730,
                          },
                        ],
                      },
                    ],
                  },
                  // SCOTCH GAME (3. d4)
                  {
                    san: 'd4',
                    name: 'Scotch Game Crossing (3. d4)',
                    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3 0 3',
                    x: 2920,
                    y: 2140,
                    children: [
                      {
                        san: 'exd4',
                        name: 'Scotch Liquidation (3... exd4)',
                        fen: 'r1bqkbnr/pppp1ppp/2n5/8/3pP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4',
                        x: 3060,
                        y: 2140,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },

      // 1.2 SICILIAN DEFENSE (1... c5) -> Branches south-west from 2500, 2000
      {
        san: 'c5',
        name: 'Sicilian Ring Road Gateway (1... c5)',
        fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
        x: 2360,
        y: 2150,
        children: [
          {
            san: 'Nf3',
            name: 'Open Sicilian Arterial (2. Nf3)',
            fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
            x: 2220,
            y: 2300,
            children: [
              // Open Sicilian (2... d6)
              {
                san: 'd6',
                name: 'Classical Open Intersection (2... d6)',
                fen: 'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
                x: 2080,
                y: 2450,
                children: [
                  {
                    san: 'd4',
                    name: 'Central Cleavage Plaza (3. d4)',
                    fen: 'rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3 0 3',
                    x: 1940,
                    y: 2450,
                    children: [
                      {
                        san: 'cxd4',
                        name: 'Pawn Break Corridor (3... cxd4)',
                        fen: 'rnbqkbnr/pp2pppp/3p4/8/3pP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4',
                        x: 1800,
                        y: 2450,
                        children: [
                          {
                            san: 'Nxd4',
                            name: 'Maroczy Hub (4. Nxd4)',
                            fen: 'rnbqkbnr/pp2pppp/3p4/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq - 0 4',
                            x: 1660,
                            y: 2450,
                            children: [
                              {
                                san: 'Nf6',
                                name: 'Tempo Pressure Boulevard (4... Nf6)',
                                fen: 'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq - 1 5',
                                x: 1520,
                                y: 2450,
                                children: [
                                  {
                                    san: 'Nc3',
                                    name: 'Najdorf Gateway (5. Nc3)',
                                    fen: 'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq - 2 5',
                                    x: 1380,
                                    y: 2450,
                                    children: [
                                      // NAJDORF (5... a6)
                                      {
                                        san: 'a6',
                                        name: 'Najdorf Grand Boulevard (5... a6)',
                                        fen: 'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6',
                                        x: 1380,
                                        y: 2600,
                                        children: [
                                          {
                                            san: 'Be3',
                                            name: 'English Attack Avenue (6. Be3)',
                                            fen: 'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N1B3/PPP2PPP/R2QKB1R b KQkq - 1 6',
                                            x: 1520,
                                            y: 2600,
                                            children: [
                                              {
                                                san: 'e6',
                                                name: 'Perenyi Square (6... e6)',
                                                fen: 'rnbqkb1r/1p3ppp/p2ppn2/8/3NP3/2N1B3/PPP2PPP/R2QKB1R w KQkq - 0 7',
                                                x: 1660,
                                                y: 2600,
                                                children: [
                                                  {
                                                    san: 'f3',
                                                    name: 'Storm Pawn Line (7. f3)',
                                                    fen: 'rnbqkb1r/1p3ppp/p2ppn2/8/3NP3/2N1BP2/PPP3PP/R2QKB1R b KQkq - 0 7',
                                                    x: 1800,
                                                    y: 2600,
                                                  },
                                                ],
                                              },
                                            ],
                                          },
                                        ],
                                      },
                                      // DRAGON (5... g6)
                                      {
                                        san: 'g6',
                                        name: 'Dragon Fianchetto Spine (5... g6)',
                                        fen: 'rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6',
                                        x: 1240,
                                        y: 2450,
                                        children: [
                                          {
                                            san: 'Be3',
                                            name: 'Yugoslav Attack Causeway (6. Be3)',
                                            fen: 'rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N1B3/PPP2PPP/R2QKB1R b KQkq - 1 6',
                                            x: 1100,
                                            y: 2450,
                                          },
                                        ],
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              // Alapin (2. c3)
              {
                san: 'c3',
                name: 'Alapin Safety Concourse (2. c3)',
                fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/2P5/PP1P1PPP/RNBQKBNR b KQkq - 0 2',
                x: 2220,
                y: 2150,
              },
            ],
          },
        ],
      },

      // 1.3 FRENCH DEFENSE (1... e6) -> Branches south from 2500, 2000
      {
        san: 'e6',
        name: 'French Defense Port (1... e6)',
        fen: 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        x: 2500,
        y: 2160,
        children: [
          {
            san: 'd4',
            name: 'French Classical Center (2. d4)',
            fen: 'rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3 0 2',
            x: 2500,
            y: 2310,
            children: [
              {
                san: 'd5',
                name: 'French Clash Square (2... d5)',
                fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6 0 3',
                x: 2500,
                y: 2460,
                children: [
                  {
                    san: 'Nc3',
                    name: 'Winawer Harbor Crossing (3. Nc3)',
                    fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR b KQkq - 1 3',
                    x: 2640,
                    y: 2460,
                    children: [
                      {
                        san: 'Bb4',
                        name: 'Winawer Pin Pier (3... Bb4)',
                        fen: 'rnbqk1nr/ppp2ppp/4p3/3p4/1b1PP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 2 4',
                        x: 2780,
                        y: 2460,
                      },
                    ],
                  },
                  {
                    san: 'e5',
                    name: 'French Advance Redoubt (3. e5)',
                    fen: 'rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq - 0 3',
                    x: 2500,
                    y: 2610,
                  },
                ],
              },
            ],
          },
        ],
      },

      // 1.4 CARO-KANN DEFENSE (1... c6) -> Branches west from 2500, 2000
      {
        san: 'c6',
        name: 'Caro-Kann Shores (1... c6)',
        fen: 'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        x: 2360,
        y: 2000,
        children: [
          {
            san: 'd4',
            name: 'Caro Solid Backbone (2. d4)',
            fen: 'rnbqkbnr/pp1ppppp/2p5/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq d3 0 2',
            x: 2220,
            y: 2000,
            children: [
              {
                san: 'd5',
                name: 'Caro Fortified Junction (2... d5)',
                fen: 'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq d6 0 3',
                x: 2080,
                y: 2000,
                children: [
                  {
                    san: 'e5',
                    name: 'Tal Advance Enclave (3. e5)',
                    fen: 'rnbqkbnr/pp2pppp/2p5/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq - 0 3',
                    x: 2080,
                    y: 1860,
                    children: [
                      {
                        san: 'Bf5',
                        name: 'Light-Square Bishop Outpost (3... Bf5)',
                        fen: 'rnbqk1nr/pp2pppp/2p5/3pP3/3P4/8/PPP2PPP/RNBQKBNR w KQkq - 1 4',
                        x: 2220,
                        y: 1860,
                        children: [
                          {
                            san: 'h4',
                            name: 'Tal Attack Battery (4. h4)',
                            fen: 'rnbqk1nr/pp2pppp/2p5/3pP3/3P3P/8/PPP2PP1/RNBQKBNR b KQkq h3 0 4',
                            x: 2360,
                            y: 1860,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  // =========================================================================
  // 2. 1.d4 OPENING TREE (Rooted exactly at 5500, 2000)
  // =========================================================================
  addBranch('continent-d4', {
    san: '1. d4',
    name: "Queen's Imperial Highway (1.d4 Origin)",
    fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
    parentFen: null,
    x: 5500,
    y: 2000,
    depth: 1,
    children: [
      // 2.1 CLOSED GAMES (1... d5) -> Queen's Gambit, Slav
      {
        san: 'd5',
        name: 'Classical Closed Concourse (1... d5)',
        fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2',
        x: 5360,
        y: 1900,
        children: [
          {
            san: 'c4',
            name: "Queen's Gambit Promenade (2. c4)",
            fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
            x: 5220,
            y: 1900,
            children: [
              // QGD (2... e6)
              {
                san: 'e6',
                name: 'Declined Bastion Avenue (2... e6)',
                fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
                x: 5080,
                y: 1780,
                children: [
                  {
                    san: 'Nc3',
                    name: 'Orthodox Foundation Square (3. Nc3)',
                    fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 1 3',
                    x: 4940,
                    y: 1780,
                    children: [
                      {
                        san: 'Nf6',
                        name: 'Tartakower Boulevard (3... Nf6)',
                        fen: 'rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4',
                        x: 4800,
                        y: 1780,
                        children: [
                          {
                            san: 'Bg5',
                            name: 'Pin Enclave (4. Bg5)',
                            fen: 'rnbqkb1r/ppp2ppp/4pn2/3p2B1/2PP4/2N5/PP2PPPP/R2QKBNR b KQkq - 3 4',
                            x: 4660,
                            y: 1780,
                            children: [
                              {
                                san: 'Be7',
                                name: 'Classical Orthodox Center (4... Be7)',
                                fen: 'rnbqk2r/ppp1bppp/4pn2/3p2B1/2PP4/2N5/PP2PPPP/R2QKBNR w KQkq - 4 5',
                                x: 4520,
                                y: 1780,
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              // SLAV DEFENSE (2... c6)
              {
                san: 'c6',
                name: 'Slav Solid Granite Road (2... c6)',
                fen: 'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
                x: 5080,
                y: 2020,
                children: [
                  {
                    san: 'Nf3',
                    name: 'Semi-Slav Gateway (3. Nf3)',
                    fen: 'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/5N2/PP2PPPP/RNBQKB1R b KQkq - 1 3',
                    x: 4940,
                    y: 2020,
                    children: [
                      {
                        san: 'Nf6',
                        name: 'Meran Defense Line (3... Nf6)',
                        fen: 'rnbqkb1r/pp2pppp/2p2n2/3p4/2PP4/5N2/PP2PPPP/RNBQKB1R w KQkq - 2 4',
                        x: 4800,
                        y: 2020,
                        children: [
                          {
                            san: 'e3',
                            name: 'Solid Stone Wall (4. e3)',
                            fen: 'rnbqkb1r/pp2pppp/2p2n2/3p4/2PP4/4PN2/PP3PPP/RNBQKB1R b KQkq - 0 4',
                            x: 4660,
                            y: 2020,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              // QGA (2... dxc4)
              {
                san: 'dxc4',
                name: 'Accepted Freedom Spur (2... dxc4)',
                fen: 'rnbqkbnr/ppp1pppp/8/8/2pP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
                x: 5220,
                y: 1760,
              },
            ],
          },
        ],
      },

      // 2.2 INDIAN DEFENSES (1... Nf6) -> King's Indian, Grünfeld, Nimzo
      {
        san: 'Nf6',
        name: 'Indian Frontier Pass (1... Nf6)',
        fen: 'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2',
        x: 5640,
        y: 2140,
        children: [
          {
            san: 'c4',
            name: 'Space Clamp Boulevard (2. c4)',
            fen: 'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
            x: 5780,
            y: 2140,
            children: [
              // KING'S INDIAN & GRÜNFELD (2... g6)
              {
                san: 'g6',
                name: 'Fianchetto Mountain Fortress (2... g6)',
                fen: 'rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
                x: 5920,
                y: 2270,
                children: [
                  {
                    san: 'Nc3',
                    name: 'Mar del Plata Ascent (3. Nc3)',
                    fen: 'rnbqkb1r/pppppp1p/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 1 3',
                    x: 6060,
                    y: 2270,
                    children: [
                      // King's Indian (3... Bg7)
                      {
                        san: 'Bg7',
                        name: "King's Indian Summit (3... Bg7)",
                        fen: 'rnbqk2r/ppppppbp/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4',
                        x: 6200,
                        y: 2270,
                        children: [
                          {
                            san: 'e4',
                            name: 'Classical Pawns Wall (4. e4)',
                            fen: 'rnbqk2r/ppppppbp/5np1/8/2PPP3/2N5/PP3PPP/R1BQKBNR b KQkq e3 0 4',
                            x: 6340,
                            y: 2270,
                            children: [
                              {
                                san: 'd6',
                                name: 'Mar del Plata Battleground (4... d6)',
                                fen: 'rnbqk2r/ppp1ppbp/3p1np1/8/2PPP3/2N5/PP3PPP/R1BQKBNR w KQkq - 0 5',
                                x: 6480,
                                y: 2270,
                              },
                            ],
                          },
                        ],
                      },
                      // Grünfeld (3... d5)
                      {
                        san: 'd5',
                        name: 'Grünfeld Canyon Highway (3... d5)',
                        fen: 'rnbqkb1r/ppp1pp1p/5np1/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq d6 0 4',
                        x: 6060,
                        y: 2410,
                        children: [
                          {
                            san: 'cxd5',
                            name: 'Exchange Variation Crater (4. cxd5)',
                            fen: 'rnbqkb1r/ppp1pp1p/5np1/3P4/3P4/2N5/PP2PPPP/R1BQKBNR b KQkq - 0 4',
                            x: 6200,
                            y: 2410,
                            children: [
                              {
                                san: 'Nxd5',
                                name: 'Counter-Attack Bastion (4... Nxd5)',
                                fen: 'rnbqkb1r/ppp1pp1p/6p1/3n4/3P4/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 5',
                                x: 6340,
                                y: 2410,
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              // NIMZO-INDIAN & QUEEN'S INDIAN (2... e6)
              {
                san: 'e6',
                name: 'Nimzo Pass Concourse (2... e6)',
                fen: 'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
                x: 5920,
                y: 2010,
                children: [
                  {
                    san: 'Nc3',
                    name: 'Pinning Station (3. Nc3)',
                    fen: 'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 1 3',
                    x: 6060,
                    y: 2010,
                    children: [
                      {
                        san: 'Bb4',
                        name: 'Nimzo-Indian Capablanca Plaza (3... Bb4)',
                        fen: 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4',
                        x: 6200,
                        y: 2010,
                        children: [
                          {
                            san: 'e3',
                            name: 'Rubinstein Solid Bastion (4. e3)',
                            fen: 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N1P3/PP3PPP/R1BQKBNR b KQkq - 0 4',
                            x: 6340,
                            y: 2010,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  // =========================================================================
  // 3. FLANK & HYPERMODERN OPENINGS TREE (Rooted exactly at 4000, 5500)
  // =========================================================================
  addBranch('continent-flank', {
    san: 'Flank',
    name: 'Flank & Hypermodern Hub (4000, 5500 Anchor)',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    parentFen: null,
    x: 4000,
    y: 5500,
    depth: 1,
    children: [
      // 3.1 ENGLISH OPENING (1. c4) -> Branches westward
      {
        san: '1. c4',
        name: 'English Flank Causeway (1. c4)',
        fen: 'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3 0 1',
        x: 3850,
        y: 5400,
        children: [
          // King's English (1... e5)
          {
            san: 'e5',
            name: "King's English Canal (1... e5)",
            fen: 'rnbqkbnr/pppp1ppp/8/4p3/2P5/8/PP1PPPPP/RNBQKBNR w KQkq e6 0 2',
            x: 3700,
            y: 5400,
            children: [
              {
                san: 'Nc3',
                name: 'Four Knights Lagoon (2. Nc3)',
                fen: 'rnbqkbnr/pppp1ppp/8/4p3/2P5/2N5/PP1PPPPP/R1BQKBNR b KQkq - 1 2',
                x: 3550,
                y: 5400,
                children: [
                  {
                    san: 'Nf6',
                    name: 'Symmetrical Harbor Cross (2... Nf6)',
                    fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2P5/2N5/PP1PPPPP/R1BQKBNR w KQkq - 2 3',
                    x: 3400,
                    y: 5400,
                    children: [
                      {
                        san: 'g3',
                        name: 'Bremen System Lighthouse (3. g3)',
                        fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2P5/2N3P1/PP1PPP1P/R1BQKBNR b KQkq - 0 3',
                        x: 3250,
                        y: 5400,
                      },
                    ],
                  },
                ],
              },
            ],
          },
          // Symmetrical English (1... c5)
          {
            san: 'c5',
            name: 'Symmetrical Atoll (1... c5)',
            fen: 'rnbqkbnr/pp1ppppp/8/2p5/2P5/8/PP1PPPPP/RNBQKBNR w KQkq c6 0 2',
            x: 3850,
            y: 5260,
            children: [
              {
                san: 'Nc3',
                name: 'Hypermodern Center Port (2. Nc3)',
                fen: 'rnbqkbnr/pp1ppppp/8/2p5/2P5/2N5/PP1PPPPP/R1BQKBNR b KQkq - 1 2',
                x: 3700,
                y: 5260,
              },
            ],
          },
        ],
      },

      // 3.2 RETI OPENING (1. Nf3) -> Branches eastward
      {
        san: '1. Nf3',
        name: 'Reti System Haven (1. Nf3)',
        fen: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1',
        x: 4150,
        y: 5400,
        children: [
          {
            san: 'd5',
            name: 'Classical Resistance Bay (1... d5)',
            fen: 'rnbqkbnr/ppp1pppp/8/3p4/8/5N2/PPPPPPPP/RNBQKB1R w KQkq d6 0 2',
            x: 4300,
            y: 5400,
            children: [
              {
                san: 'g3',
                name: 'King-Side Fianchetto Reef (2. g3)',
                fen: 'rnbqkbnr/ppp1pppp/8/3p4/8/5NP1/PPPPPP1P/RNBQKB1R b KQkq - 0 2',
                x: 4450,
                y: 5400,
                children: [
                  {
                    san: 'Nf6',
                    name: 'Reti Highway Line (2... Nf6)',
                    fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/8/5NP1/PPPPPP1P/RNBQKB1R w KQkq - 1 3',
                    x: 4600,
                    y: 5400,
                    children: [
                      {
                        san: 'Bg2',
                        name: 'Reti Observation Peak (3. Bg2)',
                        fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/8/5NP1/PPPPPPBP/RNBQK2R b KQkq - 2 3',
                        x: 4750,
                        y: 5400,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },

      // 3.3 KING'S INDIAN ATTACK -> Branches south from (4000, 5500)
      {
        san: 'KIA',
        name: "King's Indian Attack Strait",
        fen: 'rnbqkbnr/pppppppp/8/8/8/5NP1/PPPPPP1P/RNBQKB1R b KQkq - 0 1',
        x: 4000,
        y: 5660,
        children: [
          {
            san: 'd5',
            name: 'KIA Main Approach (1... d5)',
            fen: 'rnbqkbnr/ppp1pppp/8/3p4/8/5NP1/PPPPPP1P/RNBQKB1R w KQkq d6 0 2',
            x: 4000,
            y: 5800,
            children: [
              {
                san: 'Bg2',
                name: 'KIA Fianchetto Redoubt (2. Bg2)',
                fen: 'rnbqkbnr/ppp1pppp/8/3p4/8/5NP1/PPPPPPBP/RNBQK2R b KQkq - 1 2',
                x: 4140,
                y: 5800,
              },
            ],
          },
        ],
      },

      // 3.4 BIRD'S OPENING (1. f4) -> Branches north from (4000, 5500)
      {
        san: '1. f4',
        name: "Bird's Opening Outpost (1. f4)",
        fen: 'rnbqkbnr/pppppppp/8/8/5P2/8/PPPPP1PP/RNBQKBNR b KQkq f3 0 1',
        x: 4000,
        y: 5340,
      },
    ],
  });

  return { nodes, edges, nodeMap };
}
