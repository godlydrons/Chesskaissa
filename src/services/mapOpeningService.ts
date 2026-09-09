import { supabase, type Repertoire, type OpeningLine } from '../lib/supabase';
import { LOCAL_REPERTOIRE } from '../data/openings';
import { Chess } from 'chess.js';
import { 
  StreetNode, 
  StreetEdge, 
  CityStreetNetwork, 
  buildAllWorldStreetNetworks 
} from '../data/cartographyStreetGrid';

export interface FetchedOpeningData {
  source: 'supabase' | 'local_storage' | 'built_in';
  openingsCount: number;
  lines: Array<{
    id: string;
    name: string;
    moves: string[];
    repertoireName?: string;
    userColor?: 'w' | 'b';
  }>;
  statusMessage: string;
}

/**
 * World Anchor Coordinates mapped to Caissa Planitia:
 * - 1.e4 King's Dominion (2500, 2000)
 * - 1.d4 Queen's Realm (5500, 2000)
 * - The Hypermodern Isles / Flank (4000, 5500)
 */
export const WORLD_ANCHORS: Record<'E4' | 'D4' | 'FLANK', { x: number; y: number; name: string; id: string }> = {
  E4: { x: 2500, y: 2000, name: "1.e4 King's Dominion", id: 'anchor-e4' },
  D4: { x: 5500, y: 2000, name: "1.d4 Queen's Realm", id: 'anchor-d4' },
  FLANK: { x: 4000, y: 5500, name: 'The Hypermodern Isles', id: 'anchor-flank' },
};

/**
 * Fetch opening lines from Supabase with robust multi-table support
 * Checks 'openings' table, as well as 'lines' and 'repertoires' tables.
 * Falls back safely to local storage or canonical repertoire on error/offline.
 */
export async function fetchOpeningDataFromSupabase(): Promise<FetchedOpeningData> {
  const allLines: Array<{
    id: string;
    name: string;
    moves: string[];
    repertoireName?: string;
    userColor?: 'w' | 'b';
  }> = [];

  let source: 'supabase' | 'local_storage' | 'built_in' = 'built_in';
  let statusMessage = 'Using Built-in Grandmaster Database';

  if (supabase) {
    try {
      // 1. Try querying 'openings' table
      const openingsResult = await supabase
        .from('openings')
        .select('*')
        .limit(200);

      if (!openingsResult.error && openingsResult.data && openingsResult.data.length > 0) {
        source = 'supabase';
        statusMessage = `Supabase: ${openingsResult.data.length} openings synced`;

        for (const row of openingsResult.data) {
          let moves: string[] = [];
          if (Array.isArray(row.moves)) {
            moves = row.moves;
          } else if (typeof row.moves === 'string') {
            moves = row.moves.replace(/\d+\.\s*/g, '').trim().split(/\s+/).filter(Boolean);
          } else if (typeof row.pgn === 'string') {
            moves = row.pgn.replace(/\[.*?\]/g, '').replace(/\d+\.\s*/g, '').trim().split(/\s+/).filter(Boolean);
          }

          if (moves.length > 0) {
            allLines.push({
              id: row.id || `supa-op-${Math.random().toString(36).substring(7)}`,
              name: row.name || row.title || 'Supabase Opening',
              moves,
              repertoireName: row.category || row.repertoire_name || row.eco || 'Repertoire',
              userColor: row.user_color || row.color || 'w',
            });
          }
        }
      }

      // 2. Also query 'lines' and 'repertoires' tables (used by Caissa repertoire manager)
      const [linesResult, repoResult] = await Promise.allSettled([
        supabase.from('lines').select('*'),
        supabase.from('repertoires').select('*'),
      ]);

      if (linesResult.status === 'fulfilled' && !linesResult.value.error && linesResult.value.data) {
        const repoMap = new Map<string, string>();
        if (repoResult.status === 'fulfilled' && !repoResult.value.error && repoResult.value.data) {
          repoResult.value.data.forEach((r: Repertoire) => repoMap.set(r.id, r.name));
        }

        const linesData = linesResult.value.data as OpeningLine[];
        if (linesData.length > 0) {
          source = 'supabase';
          statusMessage = `Supabase Cloud Connected (${linesData.length} lines)`;

          for (const line of linesData) {
            if (line.moves && line.moves.length > 0) {
              allLines.push({
                id: line.id,
                name: line.name,
                moves: line.moves,
                repertoireName: repoMap.get(line.repertoire_id) || 'Repertoire Line',
                userColor: 'w',
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[MAP_ENGINE] Supabase fetch error, fallback to local storage', err);
    }
  }

  // If no Supabase data obtained, check localStorage
  if (allLines.length === 0 && typeof window !== 'undefined') {
    try {
      const savedLines = localStorage.getItem('caissa_local_lines');
      const savedRepos = localStorage.getItem('caissa_local_repertoires');
      if (savedLines) {
        const parsedLines = JSON.parse(savedLines);
        if (Array.isArray(parsedLines) && parsedLines.length > 0) {
          const repoMap = new Map<string, string>();
          if (savedRepos) {
            try {
              const parsedRepos = JSON.parse(savedRepos);
              if (Array.isArray(parsedRepos)) {
                parsedRepos.forEach((r: any) => repoMap.set(r.id, r.name));
              }
            } catch {
              // ignore
            }
          }

          parsedLines.forEach((l: any) => {
            if (l.moves && l.moves.length > 0) {
              allLines.push({
                id: l.id || Math.random().toString(36).substring(7),
                name: l.name || 'Local Opening',
                moves: l.moves,
                repertoireName: repoMap.get(l.repertoire_id) || l.repertoireName || 'Local Repertoire',
                userColor: l.userColor || 'w',
              });
            }
          });
          source = 'local_storage';
          statusMessage = `Local Cache (${allLines.length} lines)`;
        }
      }
    } catch (e) {
      console.warn('[MAP_ENGINE] LocalStorage read failed:', e);
    }
  }

  // Always supplement with default built-in repertoire if lines are empty
  if (allLines.length === 0) {
    LOCAL_REPERTOIRE.forEach(line => {
      allLines.push({
        id: line.id,
        name: line.name,
        moves: line.moves,
        repertoireName: line.repertoireName,
        userColor: line.userColor,
      });
    });
    source = 'built_in';
    statusMessage = 'Theory Engine Active (Foundational)';
  }

  return {
    source,
    openingsCount: allLines.length,
    lines: allLines,
    statusMessage,
  };
}

/**
 * Categorize a chess opening line into one of the three world anchors:
 * - 1.e4 -> (2500, 2000)
 * - 1.d4 -> (5500, 2000)
 * - Flank (1.c4, 1.Nf3, 1.f4, 1.b3, 1.g3) -> (4000, 5500)
 */
export function getOpeningAnchor(firstMove: string): 'E4' | 'D4' | 'FLANK' {
  const clean = firstMove?.trim().toLowerCase().replace(/^\d+\.\s*/, '');
  if (clean === 'e4') return 'E4';
  if (clean === 'd4') return 'D4';
  return 'FLANK';
}

/**
 * Builds the complete World Street Network by:
 * 1. Building the base canonical opening street trees mapped to:
 *    - 1.e4 at (2500, 2000)
 *    - 1.d4 at (5500, 2000)
 *    - Flank at (4000, 5500)
 * 2. Merging any fetched Supabase/user custom opening lines into the correct anchor
 */
export function buildHydratedWorldNetwork(
  fetchedData?: FetchedOpeningData | null
): CityStreetNetwork {
  // Start with canonical theory network mapped to the precise coordinates
  const network = buildAllWorldStreetNetworks();

  if (!fetchedData || !fetchedData.lines || fetchedData.lines.length === 0) {
    return network;
  }

  // Dynamically attach extra lines from Supabase that might not yet be in the canonical tree
  for (const line of fetchedData.lines) {
    if (!line.moves || line.moves.length === 0) continue;

    const firstMove = line.moves[0];
    const anchorType = getOpeningAnchor(firstMove);
    const anchor = WORLD_ANCHORS[anchorType];

    const chess = new Chess();
    let currentParentFen: string | null = null;
    let currentParentId: string | null = null;
    let currentX = anchor.x;
    let currentY = anchor.y;

    // Angle step for line branches
    const lineHash = line.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const angleOffset = ((lineHash % 8) - 4) * 20;

    for (let i = 0; i < line.moves.length; i++) {
      const moveSan = line.moves[i];
      try {
        const moveRes = chess.move(moveSan);
        if (!moveRes) break;

        const currentFen = chess.fen();
        const existingNode = network.nodeMap.get(currentFen);

        if (existingNode) {
          // Point is already charted in the network
          currentParentFen = currentFen;
          currentParentId = existingNode.id;
          currentX = existingNode.worldX;
          currentY = existingNode.worldY;
        } else {
          // Create new street node branching orthogonally
          const depth = i + 1;
          const isWhite = i % 2 === 0;

          // Manhattan step: alternate horizontal and vertical steps
          const stepSize = 130;
          let nextX = currentX;
          let nextY = currentY;

          if (anchorType === 'E4') {
            if (isWhite) {
              nextX = currentX + stepSize;
            } else {
              nextY = currentY + (angleOffset >= 0 ? stepSize : -stepSize);
            }
          } else if (anchorType === 'D4') {
            if (isWhite) {
              nextX = currentX - stepSize;
            } else {
              nextY = currentY + (angleOffset >= 0 ? stepSize : -stepSize);
            }
          } else {
            // Flank
            if (isWhite) {
              nextX = currentX + (angleOffset >= 0 ? stepSize : -stepSize);
            } else {
              nextY = currentY + stepSize;
            }
          }

          const nodeId = `supa-${line.id}-${moveSan}-${Math.round(nextX)}_${Math.round(nextY)}`;
          const newNode: StreetNode = {
            id: nodeId,
            cityId: anchor.id,
            fen: currentFen,
            san: moveSan,
            name: `${line.name} (Move ${depth})`,
            depth,
            worldX: nextX,
            worldY: nextY,
            parentFen: currentParentFen,
            childrenIds: [],
          };

          network.nodes.push(newNode);
          network.nodeMap.set(nodeId, newNode);
          network.nodeMap.set(currentFen, newNode);

          if (currentParentId) {
            const parentNode = network.nodeMap.get(currentParentId);
            if (parentNode) {
              parentNode.childrenIds.push(nodeId);
            }

            network.edges.push({
              id: `${currentParentId}->${nodeId}`,
              sourceId: currentParentId,
              targetId: nodeId,
              x1: currentX,
              y1: currentY,
              x2: nextX,
              y2: nextY,
              moveSan,
            });
          }

          currentParentFen = currentFen;
          currentParentId = nodeId;
          currentX = nextX;
          currentY = nextY;
        }
      } catch {
        // Move was illegal in sequence, stop branching
        break;
      }
    }
  }

  return network;
}
