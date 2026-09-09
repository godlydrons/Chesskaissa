import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
  Loader2, 
  Globe, 
  Map as MapIcon, 
  Play, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Sparkles,
  Compass,
  Navigation,
  Crosshair,
  Search,
  Zap,
  ArrowRight,
  Database,
  RefreshCw
} from 'lucide-react';
import { 
  WORLD_WIDTH,
  WORLD_HEIGHT,
  CAISSA_LANDMASSES,
  CITY_CLUSTERS, 
  TERRITORY_ZONES, 
  TRANSPOSITION_DATA_LANES,
  CityCluster, 
  TerritoryZone,
  LandmassPolygon,
  TranspositionDataLane
} from '../data/cartographyWorld';
import { 
  buildAllWorldStreetNetworks, 
  StreetNode, 
  StreetEdge, 
  CityStreetNetwork 
} from '../data/cartographyStreetGrid';
import { 
  fetchOpeningDataFromSupabase, 
  buildHydratedWorldNetwork, 
  WORLD_ANCHORS 
} from '../services/mapOpeningService';
import { 
  masteryStore, 
  resolveMoveSequence, 
  resolvePgnString, 
  NodeData 
} from '../services/masteryService';

interface RepertoireCityProps {
  onBack?: () => void;
  onTrainLine?: (pgn: string, orientation?: 'w' | 'b') => void;
}

// 8000x8000 Caissa Planitia Planetary Coordinate Plane
const MIN_SCALE = 0.12;
const MAX_SCALE = 5.0;

// Precomputed vector paths for alien landmasses and interior mountain ridges
interface CachedLandmassPaths {
  polygonPath: Path2D;
  mountainPaths: Path2D[];
  centerX: number;
  centerY: number;
  subtitle: string;
}

let cachedAlienLandmassPaths: Map<string, CachedLandmassPaths> | null = null;

function getAlienLandmassPaths(): Map<string, CachedLandmassPaths> {
  if (!cachedAlienLandmassPaths) {
    cachedAlienLandmassPaths = new Map();
    for (const landmass of CAISSA_LANDMASSES) {
      const p = new Path2D();
      let sumX = 0;
      let sumY = 0;
      if (landmass.points.length > 0) {
        p.moveTo(landmass.points[0][0], landmass.points[0][1]);
        sumX += landmass.points[0][0];
        sumY += landmass.points[0][1];
        for (let i = 1; i < landmass.points.length; i++) {
          p.lineTo(landmass.points[i][0], landmass.points[i][1]);
          sumX += landmass.points[i][0];
          sumY += landmass.points[i][1];
        }
        p.closePath();
      }

      const centerX = landmass.points.length > 0 ? sumX / landmass.points.length : 4000;
      const centerY = landmass.points.length > 0 ? sumY / landmass.points.length : 4000;

      const mountainPaths: Path2D[] = [];
      if (landmass.interiorRidges) {
        for (const ridge of landmass.interiorRidges) {
          if (ridge.length > 1) {
            const mp = new Path2D();
            mp.moveTo(ridge[0][0], ridge[0][1]);
            for (let j = 1; j < ridge.length; j++) {
              mp.lineTo(ridge[j][0], ridge[j][1]);
            }
            mountainPaths.push(mp);
          }
        }
      }

      const subtitle = landmass.hemisphere === 'western_e4'
        ? "KING'S DOMINION // OPEN SYSTEMS"
        : landmass.hemisphere === 'eastern_d4'
        ? "QUEEN'S REALM // CLOSED & SEMI-CLOSED SYSTEMS"
        : "FLANK TERRITORIES // THE HYPERMODERN ISLES";

      cachedAlienLandmassPaths.set(landmass.id, {
        polygonPath: p,
        mountainPaths,
        centerX,
        centerY,
        subtitle,
      });
    }
  }
  return cachedAlienLandmassPaths;
}

/**
 * 2D Spatial Hash Grid for O(1) hit testing in 8000x8000 world space
 */
class WorldSpatialGrid {
  private cellSize: number = 128;
  private grid: Map<string, StreetNode[]> = new Map();

  clear() {
    this.grid.clear();
  }

  insert(node: StreetNode) {
    const cx = Math.floor(node.worldX / this.cellSize);
    const cy = Math.floor(node.worldY / this.cellSize);
    const key = `${cx}_${cy}`;
    let list = this.grid.get(key);
    if (!list) {
      list = [];
      this.grid.set(key, list);
    }
    list.push(node);
  }

  query(worldX: number, worldY: number, maxRadius: number = 32): StreetNode | null {
    const minCx = Math.floor((worldX - maxRadius) / this.cellSize);
    const maxCx = Math.floor((worldX + maxRadius) / this.cellSize);
    const minCy = Math.floor((worldY - maxRadius) / this.cellSize);
    const maxCy = Math.floor((worldY + maxRadius) / this.cellSize);

    let closest: StreetNode | null = null;
    let minDistSq = maxRadius * maxRadius;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const bucket = this.grid.get(`${cx}_${cy}`);
        if (bucket) {
          for (const node of bucket) {
            const dx = node.worldX - worldX;
            const dy = node.worldY - worldY;
            const distSq = dx * dx + dy * dy;
            if (distSq <= minDistSq) {
              minDistSq = distSq;
              closest = node;
            }
          }
        }
      }
    }
    return closest;
  }
}

export function RepertoireCity({ onBack, onTrainLine }: RepertoireCityProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Unified affine camera matrix state
  // screenX = (worldX * scale) + translateX
  // screenY = (worldY * scale) + translateY
  const cameraRef = useRef({
    scale: 0.28,
    translateX: 0,
    translateY: 0,
    targetScale: 0.28,
    targetTranslateX: 0,
    targetTranslateY: 0,
    isAnimating: false,
  });

  // Telemetry state for minimal HUD
  const [telemetry, setTelemetry] = useState({
    scale: 0.28,
    worldX: 4000,
    worldY: 3500,
    layerName: 'GLOBAL ORBIT',
    activeRegionName: 'Open World',
  });

  // Selected street node
  const [selectedNode, setSelectedNode] = useState<StreetNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<StreetNode | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [supabaseStatus, setSupabaseStatus] = useState<string>('Connecting to Supabase...');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // World Street Network Data & Spatial Grid
  const streetNetworkRef = useRef<CityStreetNetwork>({ nodes: [], edges: [], nodeMap: new Map() });
  const spatialGridRef = useRef<WorldSpatialGrid>(new WorldSpatialGrid());

  // Interaction tracking refs
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const pointerDownPosRef = useRef({ x: 0, y: 0, time: 0 });
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartCenterRef = useRef<{ x: number; y: number } | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  /**
   * Fetch Opening Data from Supabase and Populate Spatial Hash Grid
   * Maps 1.e4 openings at (2500, 2000), 1.d4 at (5500, 2000), and Flank at (4000, 5500)
   */
  const loadWorldData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const fetched = await fetchOpeningDataFromSupabase();
      setSupabaseStatus(fetched.statusMessage);

      const network = buildHydratedWorldNetwork(fetched);
      streetNetworkRef.current = network;

      // Ensure spatial hash grid is populated with all coordinates
      const grid = spatialGridRef.current;
      grid.clear();
      network.nodes.forEach(node => grid.insert(node));
    } catch (err) {
      console.warn('[MAP_ENGINE] Error loading opening data from Supabase:', err);
      const network = buildAllWorldStreetNetworks();
      streetNetworkRef.current = network;
      const grid = spatialGridRef.current;
      grid.clear();
      network.nodes.forEach(node => grid.insert(node));
      setSupabaseStatus('Theory Engine (Foundational)');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Initialize network, spatial grid, and camera
  useEffect(() => {
    loadWorldData();

    // Center camera on Caissa Planitia planetary overview (4000, 3800)
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      const initialScale = 0.18;
      const initialWorldX = 4000;
      const initialWorldY = 3800;
      const tx = clientWidth / 2 - initialWorldX * initialScale;
      const ty = clientHeight / 2 - initialWorldY * initialScale;

      cameraRef.current.scale = initialScale;
      cameraRef.current.translateX = tx;
      cameraRef.current.translateY = ty;
      cameraRef.current.targetScale = initialScale;
      cameraRef.current.targetTranslateX = tx;
      cameraRef.current.targetTranslateY = ty;
    }
  }, [loadWorldData]);

  /**
   * Smooth Flight Animation Controller (like Google Earth / Mapbox flyTo)
   */
  const flyTo = useCallback((worldX: number, worldY: number, targetScale: number) => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const clampedScale = Math.min(Math.max(targetScale, MIN_SCALE), MAX_SCALE);
    const targetTx = clientWidth / 2 - worldX * clampedScale;
    const targetTy = clientHeight / 2 - worldY * clampedScale;

    cameraRef.current.targetScale = clampedScale;
    cameraRef.current.targetTranslateX = targetTx;
    cameraRef.current.targetTranslateY = targetTy;
    cameraRef.current.isAnimating = true;
  }, []);

  /**
   * Canvas Rendering Engine Loop (Hardware Accelerated 2D Canvas)
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const cam = cameraRef.current;

      // Smooth Camera Lerp Animation
      if (cam.isAnimating) {
        const lerpFactor = 0.08;
        cam.scale += (cam.targetScale - cam.scale) * lerpFactor;
        cam.translateX += (cam.targetTranslateX - cam.translateX) * lerpFactor;
        cam.translateY += (cam.targetTranslateY - cam.translateY) * lerpFactor;

        if (
          Math.abs(cam.targetScale - cam.scale) < 0.002 &&
          Math.abs(cam.targetTranslateX - cam.translateX) < 1 &&
          Math.abs(cam.targetTranslateY - cam.translateY) < 1
        ) {
          cam.scale = cam.targetScale;
          cam.translateX = cam.targetTranslateX;
          cam.translateY = cam.targetTranslateY;
          cam.isAnimating = false;
        }
      }

      const width = canvas.width;
      const height = canvas.height;

      // Compute Frustum in World Coordinates
      const minWX = (0 - cam.translateX) / cam.scale;
      const minWY = (0 - cam.translateY) / cam.scale;
      const maxWX = (width - cam.translateX) / cam.scale;
      const maxWY = (height - cam.translateY) / cam.scale;
      const centerWX = (width / 2 - cam.translateX) / cam.scale;
      const centerWY = (height / 2 - cam.translateY) / cam.scale;

      // Determine Layer Level of Detail by camera scale
      // Macro Layer (< 0.5: Global Orbit)
      // Territory Layer (0.5 <= scale < 2.0: Regional Flight)
      // Street Layer (scale >= 2.0: Urban Dive)
      const macroOpacity = Math.max(0.12, Math.min(1.0, 1.0 - (cam.scale - 0.45) / 1.5));
      const clusterOpacity = Math.max(0.0, Math.min(1.0, 1.0 - (cam.scale - 0.6) / 1.4));
      
      let territoryOpacity = 0;
      if (cam.scale < 0.4) {
        territoryOpacity = Math.max(0, (cam.scale - 0.25) / 0.15);
      } else if (cam.scale < 2.0) {
        territoryOpacity = 1.0;
      } else {
        territoryOpacity = Math.max(0, 1.0 - (cam.scale - 2.0) / 0.8);
      }

      const streetOpacity = Math.max(0.0, Math.min(1.0, (cam.scale - 1.2) / 0.8));

      // Layer Identification for HUD
      let currentLayer = 'GLOBAL ORBIT';
      if (cam.scale >= 2.0) {
        currentLayer = 'URBAN DIVE';
      } else if (cam.scale >= 0.5) {
        currentLayer = 'REGIONAL FLIGHT';
      }

      // Update telemetry throttle
      if (Math.random() < 0.1) {
        // Find nearest territory zone to center of camera
        let nearestZone = 'Deep Water Basin';
        let minDistSq = Infinity;
        for (const zone of TERRITORY_ZONES) {
          const dx = zone.worldX - centerWX;
          const dy = zone.worldY - centerWY;
          const d2 = dx * dx + dy * dy;
          if (d2 < minDistSq && d2 < 1200 * 1200) {
            minDistSq = d2;
            nearestZone = zone.name;
          }
        }

        setTelemetry({
          scale: Number(cam.scale.toFixed(2)),
          worldX: Math.round(centerWX),
          worldY: Math.round(centerWY),
          layerName: currentLayer,
          activeRegionName: nearestZone,
        });
      }

      // 1. CLEAR DEEP SPACE BACKGROUND
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Save canvas state for unified affine camera matrix
      ctx.save();
      ctx.translate(cam.translateX, cam.translateY);
      ctx.scale(cam.scale, cam.scale);

      // 2. WORLD SPACE COORDINATE GRID (Longitudes & Latitudes)
      const gridSpacing = 1000;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.lineWidth = 1 / cam.scale;
      ctx.beginPath();
      for (let x = 0; x <= WORLD_WIDTH; x += gridSpacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD_HEIGHT);
      }
      for (let y = 0; y <= WORLD_HEIGHT; y += gridSpacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD_WIDTH, y);
      }
      ctx.stroke();

      // Oceanic Depth Contour Waves
      const nowTime = Date.now() / 1000;
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.08)';
      ctx.lineWidth = 2 / cam.scale;
      ctx.strokeRect(100, 100, WORLD_WIDTH - 200, WORLD_HEIGHT - 200);

      // 3. LAYER 1: OBSIDIAN OCEAN OF VARIATIONS (Bathymetry & Rift Trenches)
      const streetCrossFade = Math.max(0.0, Math.min(1.0, (cam.scale - 0.9) / 0.8));
      const macroAlpha = Math.max(0.18, 1.0 - streetCrossFade * 0.75);

      ctx.save();
      ctx.globalAlpha = macroAlpha;

      // Mid-Planetary Oceanic Rift (Ocean of Variations)
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.12)';
      ctx.lineWidth = Math.max(1.2, 3.0 / cam.scale);
      ctx.beginPath();
      ctx.moveTo(4000, 400);
      ctx.bezierCurveTo(4200, 1800, 3800, 3200, 4000, 4800);
      ctx.stroke();

      // Bathymetric Depth Rings
      const oceanWaves = [1200, 2400, 3600];
      for (const r of oceanWaves) {
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.04)';
        ctx.lineWidth = 1 / cam.scale;
        ctx.beginPath();
        ctx.arc(4000, 4000, r + Math.sin(nowTime + r * 0.001) * 20, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. LAYER 2: VECTOR ALIEN SUPERCONTINENTS (Caissa Planitia)
      const landmassMap = getAlienLandmassPaths();

      for (const landmass of CAISSA_LANDMASSES) {
        const cached = landmassMap.get(landmass.id);
        if (!cached) continue;

        // 4a. Solid Landmass Geological Core Fill
        ctx.save();
        ctx.fillStyle = landmass.baseColor;
        ctx.shadowColor = landmass.glowColor;
        ctx.shadowBlur = Math.min(25, 30 / Math.sqrt(cam.scale));
        ctx.fill(cached.polygonPath);
        ctx.restore();

        // 4b. Atmospheric Neon Coastline Bloom
        ctx.save();
        ctx.strokeStyle = landmass.glowColor;
        ctx.lineWidth = Math.max(3.0, 7.0 / Math.sqrt(cam.scale));
        ctx.shadowColor = landmass.glowColor;
        ctx.shadowBlur = Math.min(20, 24 / Math.sqrt(cam.scale));
        ctx.stroke(cached.polygonPath);
        ctx.restore();

        // 4c. Sharp Littoral Coastal Edge
        ctx.save();
        ctx.strokeStyle = landmass.coastColor;
        ctx.lineWidth = Math.max(1.2, 2.4 / cam.scale);
        ctx.stroke(cached.polygonPath);
        ctx.restore();

        // 4d. Interior Mountain Ranges & Fracture Ridges
        if (cached.mountainPaths.length > 0) {
          ctx.save();
          ctx.strokeStyle = landmass.glowColor;
          ctx.lineWidth = Math.max(0.8, 1.6 / cam.scale);
          ctx.setLineDash([8 / cam.scale, 6 / cam.scale]);
          for (const mp of cached.mountainPaths) {
            ctx.stroke(mp);
          }
          ctx.setLineDash([]);
          ctx.restore();
        }

        // 4e. High-Altitude Supercontinent Header
        if (cam.scale < 0.9) {
          ctx.save();
          ctx.fillStyle = landmass.coastColor;
          ctx.font = `900 ${Math.max(22, 38 / cam.scale)}px monospace`;
          ctx.textAlign = 'center';
          ctx.shadowColor = landmass.glowColor;
          ctx.shadowBlur = 12;
          ctx.fillText(landmass.name.toUpperCase(), cached.centerX, cached.centerY);

          ctx.fillStyle = 'rgba(203, 213, 225, 0.7)';
          ctx.font = `bold ${Math.max(12, 18 / cam.scale)}px monospace`;
          ctx.shadowBlur = 0;
          ctx.fillText(cached.subtitle, cached.centerX, cached.centerY + 45 / cam.scale);
          ctx.restore();
        }
      }

      // 5. LAYER 3: THEORETICAL TRANSPOSITION DATA LANES
      // Glowing vector curves connecting distant theoretical hubs across the ocean
      for (const lane of TRANSPOSITION_DATA_LANES) {
        ctx.save();
        ctx.strokeStyle = lane.color;
        ctx.lineWidth = Math.max(1.4, 2.8 / cam.scale);
        ctx.shadowColor = lane.color;
        ctx.shadowBlur = 8;
        ctx.setLineDash([12 / cam.scale, 8 / cam.scale]);
        ctx.lineDashOffset = -nowTime * 20;

        ctx.beginPath();
        ctx.moveTo(lane.source[0], lane.source[1]);
        ctx.bezierCurveTo(
          lane.controlPoint1[0],
          lane.controlPoint1[1],
          lane.controlPoint2[0],
          lane.controlPoint2[1],
          lane.target[0],
          lane.target[1]
        );
        ctx.stroke();
        ctx.setLineDash([]);

        // Theoretical Midpoint Transfer Beacon
        if (cam.scale >= 0.22 && cam.scale < 1.3) {
          const midX = (lane.controlPoint1[0] + lane.controlPoint2[0]) / 2;
          const midY = (lane.controlPoint1[1] + lane.controlPoint2[1]) / 2;

          ctx.fillStyle = lane.color;
          ctx.beginPath();
          ctx.arc(midX, midY, 4 / cam.scale, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = `${Math.max(9, 13 / cam.scale)}px monospace`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.textAlign = 'center';
          ctx.fillText(lane.name, midX, midY - 8 / cam.scale);
        }
        ctx.restore();
      }

      ctx.restore();

      // 6. LAYER 4: SECTOR NODES & THEORETICAL CAPITALS (Atmospheric Neon Bloom)
      if (clusterOpacity > 0.02) {
        ctx.save();
        ctx.globalAlpha = clusterOpacity;

        // Render City Light Clusters & Theoretical Capitals
        for (const city of CITY_CLUSTERS) {
          // Frustum cull city cluster
          if (
            city.worldX < minWX - 400 ||
            city.worldX > maxWX + 400 ||
            city.worldY < minWY - 400 ||
            city.worldY > maxWY + 400
          ) {
            continue;
          }

          const pulse = 0.85 + Math.sin(nowTime * 2.5 + city.worldX * 0.01) * 0.15;

          // Atmospheric Neon Bloom: Multi-layer radial halo
          const haloRadius = 140 * pulse;
          const radGrad = ctx.createRadialGradient(
            city.worldX,
            city.worldY,
            2,
            city.worldX,
            city.worldY,
            haloRadius
          );
          radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          radGrad.addColorStop(0.18, city.color);
          radGrad.addColorStop(0.65, `${city.color}33`);
          radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = radGrad;
          ctx.beginPath();
          ctx.arc(city.worldX, city.worldY, haloRadius, 0, Math.PI * 2);
          ctx.fill();

          // Satellite light scatter points
          for (const light of city.lights) {
            const lx = city.worldX + light.dx;
            const ly = city.worldY + light.dy;
            const r = light.r * pulse;

            ctx.fillStyle = light.color;
            ctx.beginPath();
            ctx.arc(lx, ly, r, 0, Math.PI * 2);
            ctx.fill();
          }

          // Central Star Beacon Core
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(city.worldX, city.worldY, Math.max(3, 5 / Math.sqrt(cam.scale)), 0, Math.PI * 2);
          ctx.fill();

          // High-Altitude Sector Capital Badge
          if (cam.scale >= 0.22 && cam.scale < 1.4) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.font = `bold ${Math.max(13, 20 / cam.scale)}px monospace`;
            ctx.textAlign = 'center';
            ctx.shadowColor = city.color;
            ctx.shadowBlur = 8;
            ctx.fillText(city.name.toUpperCase(), city.worldX, city.worldY + 70 / cam.scale);

            ctx.fillStyle = city.color;
            ctx.font = `bold ${Math.max(10, 15 / cam.scale)}px monospace`;
            ctx.shadowBlur = 0;
            ctx.fillText(`[ ${city.tag} ]`, city.worldX, city.worldY + 92 / cam.scale);
          }
        }

        ctx.restore();
      }

      // 5. TERRITORY LAYER (Regional Flight: 0.5 <= scale < 2.0)
      if (territoryOpacity > 0.05) {
        ctx.save();
        ctx.globalAlpha = territoryOpacity;

        for (const zone of TERRITORY_ZONES) {
          if (
            zone.worldX < minWX - 500 ||
            zone.worldX > maxWX + 500 ||
            zone.worldY < minWY - 500 ||
            zone.worldY > maxWY + 500
          ) {
            continue;
          }

          // Territory Radar Range Ring
          ctx.strokeStyle = zone.color;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.arc(zone.worldX, zone.worldY, 320, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Holographic Territory Header
          ctx.fillStyle = zone.color;
          ctx.font = `900 ${Math.max(16, 26 / cam.scale)}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(`┌── ${zone.name.toUpperCase()} [${zone.eco}] ──┐`, zone.worldX, zone.worldY - 340);

          // Sub-District Names Callouts
          if (cam.scale >= 0.75) {
            ctx.font = `bold ${Math.max(11, 16 / cam.scale)}px monospace`;
            ctx.fillStyle = 'rgba(203, 213, 225, 0.85)';
            const radius = 250;
            zone.subDistricts.forEach((dist, idx) => {
              const angle = (idx / zone.subDistricts.length) * Math.PI * 2 - Math.PI / 2;
              const dx = Math.cos(angle) * radius;
              const dy = Math.sin(angle) * radius;
              ctx.fillText(`• ${dist}`, zone.worldX + dx, zone.worldY + dy);
            });
          }
        }

        ctx.restore();
      }

      // 6. LAYER 3: 90-DEGREE MANHATTAN ORTHOGONAL STREET NETWORK (scale >= 1.2, peaks at scale >= 2.0)
      if (streetOpacity > 0.02) {
        ctx.save();
        ctx.globalAlpha = streetOpacity;

        const network = streetNetworkRef.current;

        // Street Avenues (Edges)
        for (const edge of network.edges) {
          // Frustum culling check for edge segment
          const minX = Math.min(edge.x1, edge.x2);
          const maxX = Math.max(edge.x1, edge.x2);
          const minY = Math.min(edge.y1, edge.y2);
          const maxY = Math.max(edge.y1, edge.y2);

          if (maxX < minWX - 50 || minX > maxWX + 50 || maxY < minWY - 50 || minY > maxWY + 50) {
            continue;
          }

          // Check if parent or target node is mastered
          const targetNode = network.nodeMap.get(edge.targetId);
          const isMastered = targetNode ? masteryStore.isFenMastered(targetNode.cityId, targetNode.fen) : false;

          // 1. Asphalt Road Underlay
          ctx.strokeStyle = '#090d16';
          ctx.lineWidth = 14;
          ctx.lineCap = 'square';
          ctx.beginPath();
          // Strict 90-degree orthogonal line (Manhattan)
          if (edge.x1 === edge.x2 || edge.y1 === edge.y2) {
            ctx.moveTo(edge.x1, edge.y1);
            ctx.lineTo(edge.x2, edge.y2);
          } else {
            // L-turn: horizontal then vertical
            ctx.moveTo(edge.x1, edge.y1);
            ctx.lineTo(edge.x2, edge.y1);
            ctx.lineTo(edge.x2, edge.y2);
          }
          ctx.stroke();

          // 2. Glowing Street Centerline
          ctx.strokeStyle = isMastered ? '#00f0ff' : 'rgba(56, 189, 248, 0.45)';
          ctx.lineWidth = isMastered ? 3.5 : 2;
          ctx.beginPath();
          if (edge.x1 === edge.x2 || edge.y1 === edge.y2) {
            ctx.moveTo(edge.x1, edge.y1);
            ctx.lineTo(edge.x2, edge.y2);
          } else {
            ctx.moveTo(edge.x1, edge.y1);
            ctx.lineTo(edge.x2, edge.y1);
            ctx.lineTo(edge.x2, edge.y2);
          }
          ctx.stroke();

          // 3. Move SAN Street Label (only when zoomed in close)
          if (cam.scale >= 2.2) {
            const midX = (edge.x1 + edge.x2) / 2;
            const midY = (edge.y1 + edge.y2) / 2;
            ctx.fillStyle = isMastered ? '#00f0ff' : 'rgba(148, 163, 184, 0.8)';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(edge.moveSan, midX, midY - 8);
          }
        }

        // Street Position Intersections (Nodes)
        for (const node of network.nodes) {
          if (
            node.worldX < minWX - 50 ||
            node.worldX > maxWX + 50 ||
            node.worldY < minWY - 50 ||
            node.worldY > maxWY + 50
          ) {
            continue;
          }

          const isSelected = selectedNode?.id === node.id;
          const isHovered = hoveredNode?.id === node.id;
          const isMastered = masteryStore.isFenMastered(node.cityId, node.fen);

          // Node Base Ring
          ctx.beginPath();
          const nodeRadius = isSelected ? 12 : isHovered ? 10 : 8;
          ctx.arc(node.worldX, node.worldY, nodeRadius, 0, Math.PI * 2);

          ctx.fillStyle = isSelected
            ? '#00f0ff'
            : isMastered
            ? '#10b981'
            : isHovered
            ? '#38bdf8'
            : '#1e293b';
          ctx.fill();

          ctx.strokeStyle = isSelected ? '#ffffff' : '#020617';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Selection Pulse Beacon
          if (isSelected) {
            const beaconRadius = 14 + Math.sin(nowTime * 5) * 6;
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(node.worldX, node.worldY, beaconRadius, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Node SAN Label
          if (cam.scale >= 1.6) {
            ctx.fillStyle = isSelected ? '#00f0ff' : '#ffffff';
            ctx.font = `bold ${isSelected ? 12 : 10}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(node.san, node.worldX, node.worldY - (nodeRadius + 4));
          }
        }

        ctx.restore();
      }

      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [selectedNode, hoveredNode]);

  /**
   * Screen resize observer
   */
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      canvasRef.current.width = clientWidth;
      canvasRef.current.height = clientHeight;
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  /**
   * Pointer & Touch Unified Gestures with Touch-Optimized Hit Testing
   */
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cam = cameraRef.current;

    // Drag to pan world
    if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      cam.translateX += dx;
      cam.translateY += dy;
      cam.targetTranslateX = cam.translateX;
      cam.targetTranslateY = cam.translateY;
      cam.isAnimating = false;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    }

    // Hover detection on street nodes (enabled at regional and urban scales)
    if (cam.scale >= 0.9) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldX = (screenX - cam.translateX) / cam.scale;
      const worldY = (screenY - cam.translateY) / cam.scale;

      const hit = spatialGridRef.current.query(worldX, worldY, Math.max(28 / cam.scale, 20));
      setHoveredNode(hit);
    } else {
      if (hoveredNode) setHoveredNode(null);
    }
  };

  const performHitTest = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    const cam = cameraRef.current;
    const rect = canvasRef.current.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const worldX = (screenX - cam.translateX) / cam.scale;
    const worldY = (screenY - cam.translateY) / cam.scale;

    // Generous touch-aware hit testing radius (at least 48px screen radius mapped to world space)
    const touchRadius = Math.max(48 / cam.scale, 28);
    const hit = spatialGridRef.current.query(worldX, worldY, touchRadius);

    if (hit) {
      setSelectedNode(hit);
      // If user tapped from distance, smoothly dive into the node
      if (cam.scale < 1.4) {
        flyTo(hit.worldX, hit.worldY, 2.2);
      }
      return;
    }

    // Direct anchor detection for the three major opening coordinates:
    // 1.e4 at (2500, 2000), 1.d4 at (5500, 2000), Flank at (4000, 5500)
    const openingAnchors = [
      { name: "1.e4 King's Dominion", x: 2500, y: 2000 },
      { name: "1.d4 Queen's Realm", x: 5500, y: 2000 },
      { name: 'The Hypermodern Isles', x: 4000, y: 5500 },
    ];
    for (const anchor of openingAnchors) {
      const adx = anchor.x - worldX;
      const ady = anchor.y - worldY;
      if (adx * adx + ady * ady < 450 * 450) {
        flyTo(anchor.x, anchor.y, 2.2);
        return;
      }
    }

    // City Clusters check
    for (const city of CITY_CLUSTERS) {
      const cdx = city.worldX - worldX;
      const cdy = city.worldY - worldY;
      if (cdx * cdx + cdy * cdy < 280 * 280) {
        flyTo(city.worldX, city.worldY, 2.4);
        return;
      }
    }

    // Otherwise deselect if clicked empty space
    setSelectedNode(null);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    // Detect deliberate touch tap or click (short duration < 450ms, displacement < 14px)
    const dx = Math.abs(e.clientX - pointerDownPosRef.current.x);
    const dy = Math.abs(e.clientY - pointerDownPosRef.current.y);
    const dt = Date.now() - pointerDownPosRef.current.time;

    if (dx < 14 && dy < 14 && dt < 450) {
      performHitTest(e.clientX, e.clientY);
    }
  };

  /**
   * Direct Touch Start Handler for Multi-Touch Gestures
   */
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      touchStartDistRef.current = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      touchStartCenterRef.current = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      pointerDownPosRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }
  };

  /**
   * Wheel Zoom anchored directly at cursor position
   */
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const cam = cameraRef.current;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // World coords under mouse before zoom
    const worldX = (screenX - cam.translateX) / cam.scale;
    const worldY = (screenY - cam.translateY) / cam.scale;

    // Zoom multiplier
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    const newScale = Math.min(Math.max(cam.scale * factor, MIN_SCALE), MAX_SCALE);

    cam.translateX = screenX - worldX * newScale;
    cam.translateY = screenY - worldY * newScale;
    cam.scale = newScale;
    cam.targetScale = newScale;
    cam.targetTranslateX = cam.translateX;
    cam.targetTranslateY = cam.translateY;
    cam.isAnimating = false;
  };

  /**
   * Multi-touch pinch-to-zoom
   */
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const center = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };

      if (touchStartDistRef.current !== null && touchStartCenterRef.current !== null) {
        const cam = cameraRef.current;
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const screenX = center.x - rect.left;
        const screenY = center.y - rect.top;
        const worldX = (screenX - cam.translateX) / cam.scale;
        const worldY = (screenY - cam.translateY) / cam.scale;

        const factor = dist / touchStartDistRef.current;
        const newScale = Math.min(Math.max(cam.scale * factor, MIN_SCALE), MAX_SCALE);

        cam.translateX = screenX - worldX * newScale;
        cam.translateY = screenY - worldY * newScale;
        cam.scale = newScale;
        cam.targetScale = newScale;
        cam.targetTranslateX = cam.translateX;
        cam.targetTranslateY = cam.translateY;
      }

      touchStartDistRef.current = dist;
      touchStartCenterRef.current = center;
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
    touchStartCenterRef.current = null;
  };

  /**
   * Manual Zoom In / Out Buttons
   */
  const zoomByStep = (multiplier: number) => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const cam = cameraRef.current;
    const centerX = clientWidth / 2;
    const centerY = clientHeight / 2;
    const worldX = (centerX - cam.translateX) / cam.scale;
    const worldY = (centerY - cam.translateY) / cam.scale;

    const newScale = Math.min(Math.max(cam.scale * multiplier, MIN_SCALE), MAX_SCALE);
    const newTx = centerX - worldX * newScale;
    const newTy = centerY - worldY * newScale;

    cam.targetScale = newScale;
    cam.targetTranslateX = newTx;
    cam.targetTranslateY = newTy;
    cam.isAnimating = true;
  };

  /**
   * Launch Training on Selected Street Line
   */
  const handleTrainSelectedLine = () => {
    if (!selectedNode || !onTrainLine) return;
    const pgn = resolvePgnString(selectedNode.fen, streetNetworkRef.current.nodeMap as any);
    onTrainLine(pgn || `${selectedNode.san}`);
  };

  // Reconstructed move sequence for drawer
  const selectedMoves = useMemo(() => {
    if (!selectedNode) return [];
    return resolveMoveSequence(selectedNode.fen, streetNetworkRef.current.nodeMap as any);
  }, [selectedNode]);

  // Filtered Jump Locations for Search Bar
  const searchResults = useMemo(() => {
    if (!searchFilter.trim()) return [];
    const q = searchFilter.toLowerCase();
    return CITY_CLUSTERS.filter(
      c => c.name.toLowerCase().includes(q) || c.tag.toLowerCase().includes(q)
    );
  }, [searchFilter]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative bg-[#020617] overflow-hidden select-none"
    >
      {/* 
        ========================================================================
        CRITICAL ARCHITECTURAL CORE: SINGLE INTERACTIVE 2D CANVAS VIEWPORT
        Zero DOM / flexbox cards. Continuous level-of-detail zoom engine.
        ========================================================================
      */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      />

      {/* 1. TOP-LEFT HUD: MISSION TELEMETRY (Transparent, Minimal, Pointer-Events-None) */}
      <div className="absolute top-2 left-2 sm:top-5 sm:left-5 z-20 flex flex-col gap-1.5 sm:gap-2 pointer-events-none max-w-[calc(100vw-1rem)] sm:max-w-none">
        <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800/80 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg backdrop-blur-md shadow-2xl">
          <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 animate-spin-slow shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-mono font-black text-white tracking-wider truncate">
            CAISSA PLANITIA
          </span>
          <span className="text-slate-600 hidden md:inline">|</span>
          <span className="text-[10px] font-mono font-bold text-cyan-400 hidden md:inline">
            8000×8000 EXOPLANETARY SECTOR GRID
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono bg-slate-950/60 border border-slate-800/60 px-3 py-1.5 rounded-lg backdrop-blur text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]" />
            <span className="text-slate-400">ALTITUDE:</span>
            <span className="text-cyan-300 font-bold">{telemetry.layerName} ({telemetry.scale}x)</span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">COORDS:</span>
            <span className="text-slate-200">{telemetry.worldX}, {telemetry.worldY}</span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1 text-emerald-400 font-semibold">
            <span>{telemetry.activeRegionName}</span>
          </div>
        </div>

        {/* Supabase Status & Sync Indicator */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-950/70 border border-slate-800/80 px-3 py-1 rounded-lg backdrop-blur-md text-[10px] font-mono pointer-events-auto">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">SUPABASE:</span>
          <span className="text-emerald-300 font-medium truncate max-w-[200px]">
            {supabaseStatus}
          </span>
          <button
            onClick={loadWorldData}
            disabled={isSyncing}
            className="ml-auto p-1 rounded hover:bg-slate-850 text-slate-400 hover:text-cyan-400 cursor-pointer disabled:opacity-50 transition-colors"
            title="Refresh opening data from Supabase"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. TOP-RIGHT: GLIDE JUMPBAR (Anchored to Caissa Planitia Opening Territories) */}
      <div className="absolute top-2 right-2 sm:top-5 sm:right-5 z-20 flex flex-col items-end gap-2 pointer-events-auto">
        <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-950/80 border border-slate-800/80 p-1 rounded-xl backdrop-blur-md shadow-xl flex-wrap justify-end max-w-[220px] xs:max-w-[280px] sm:max-w-none">
          {/* Planetary Orbit View */}
          <button
            onClick={() => flyTo(4000, 3800, 0.18)}
            className="px-2.5 py-1 text-[10px] font-mono rounded-lg transition-all text-slate-400 hover:text-cyan-300 hover:bg-slate-900 cursor-pointer"
            title="Caissa Planitia Planetary Orbit"
          >
            ORBIT
          </button>
          {/* King's Dominion (1.e4 Macro) */}
          <button
            onClick={() => flyTo(2500, 2000, 0.65)}
            className="px-2 py-1 text-[10px] font-mono rounded-lg transition-all text-cyan-400 hover:bg-cyan-950/40 cursor-pointer font-bold flex items-center gap-1"
            title="1.e4 King's Dominion (Western Supercontinent)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            KING'S DOMINION
          </button>
          {/* Ruy Lopez Metro */}
          <button
            onClick={() => flyTo(3060, 2000, 1.8)}
            className="px-2 py-1 text-[10px] font-mono rounded-lg transition-all text-sky-400 hover:bg-sky-950/40 cursor-pointer font-bold flex items-center gap-1"
            title="Ruy Lopez Metro (3060, 2000)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            RUY LOPEZ
          </button>
          {/* Sicilian Metropolis */}
          <button
            onClick={() => flyTo(2500, 1860, 1.8)}
            className="px-2 py-1 text-[10px] font-mono rounded-lg transition-all text-emerald-400 hover:bg-emerald-950/40 cursor-pointer font-bold flex items-center gap-1"
            title="Sicilian Metropolis (2500, 1860)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            SICILIAN
          </button>
          {/* Queen's Realm (1.d4 Macro) */}
          <button
            onClick={() => flyTo(5500, 2000, 0.65)}
            className="px-2 py-1 text-[10px] font-mono rounded-lg transition-all text-amber-400 hover:bg-amber-950/40 cursor-pointer font-bold flex items-center gap-1"
            title="1.d4 Queen's Realm (Eastern Supercontinent)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            QUEEN'S REALM
          </button>
          {/* Queen's Gambit Heartland */}
          <button
            onClick={() => flyTo(5220, 2000, 1.8)}
            className="px-2 py-1 text-[10px] font-mono rounded-lg transition-all text-yellow-400 hover:bg-yellow-950/40 cursor-pointer font-bold flex items-center gap-1"
            title="Queen's Gambit Heartland (5220, 2000)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            QUEEN'S GAMBIT
          </button>
          {/* Hypermodern Isles (Flank) */}
          <button
            onClick={() => flyTo(4000, 5500, 1.4)}
            className="px-2 py-1 text-[10px] font-mono rounded-lg transition-all text-indigo-400 hover:bg-indigo-950/40 cursor-pointer font-bold flex items-center gap-1"
            title="The Hypermodern Isles (Flank 1.c4 / 1.Nf3)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            HYPERMODERN
          </button>
        </div>

        {/* Quick Search Bar */}
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Glide search (e.g. Najdorf, Ruy...)"
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-[11px] font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 shadow-lg"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full right-0 mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl z-30">
              {searchResults.map(city => (
                <div
                  key={city.id}
                  onClick={() => {
                    flyTo(city.worldX, city.worldY, 2.4);
                    setSearchFilter('');
                  }}
                  className="px-3 py-2 text-[11px] font-mono hover:bg-slate-900 cursor-pointer flex justify-between items-center text-slate-200 border-b border-white/5 last:border-0"
                >
                  <span className="font-bold text-cyan-300">{city.name}</span>
                  <span className="text-[9px] text-slate-500">{city.tag}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. BOTTOM-RIGHT: CAMERA CONTROLS (+, -, Orbit Reset) */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-1.5 pointer-events-auto bg-slate-950/80 border border-slate-800 p-1.5 rounded-xl backdrop-blur-md shadow-2xl">
        <button
          onClick={() => zoomByStep(1.35)}
          className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
          title="Zoom In (or Wheel Up)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => zoomByStep(0.72)}
          className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
          title="Zoom Out (or Wheel Down)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => flyTo(4000, 3200, 0.28)}
          className="p-2 text-slate-300 hover:text-cyan-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
          title="Reset to Planetary Orbit"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* 4. SELECTED STREET NODE INSPECTION DRAWER (Urban Dive) */}
      {selectedNode && (
        <div className="absolute bottom-20 left-6 z-30 w-84 bg-slate-950/95 backdrop-blur-xl border border-cyan-500/40 rounded-xl p-4 shadow-[0_0_40px_rgba(0,0,0,0.9)] space-y-3 pointer-events-auto animate-in fade-in slide-in-from-bottom duration-200">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                Urban Intersection Node
              </span>
              <h3 className="text-xl font-black text-white font-mono flex items-center gap-2">
                <span>{selectedNode.san}</span>
                {masteryStore.isFenMastered(selectedNode.cityId, selectedNode.fen) && (
                  <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-500/50 px-1.5 py-0.5 rounded uppercase font-sans">
                    Mastered
                  </span>
                )}
              </h3>
              <p className="text-[11px] font-mono text-slate-400">{selectedNode.name}</p>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-500 hover:text-white text-xs font-mono p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1 bg-slate-900/70 p-2.5 rounded-lg border border-white/5">
            <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block">
              Move Sequence from Root
            </span>
            <p className="text-[11px] font-mono text-cyan-300 leading-relaxed font-semibold">
              {selectedMoves.length > 0 ? selectedMoves.join(' → ') : selectedNode.san}
            </p>
          </div>

          <button
            onClick={handleTrainSelectedLine}
            className="w-full py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black uppercase font-mono text-[11px] tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] cursor-pointer active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            ENGAGE N+1 DRILL
          </button>
        </div>
      )}

      {/* 5. Minimal HUD Bottom Altitude Guide */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden md:flex items-center gap-3 px-4 py-1.5 bg-slate-950/70 border border-slate-800/80 rounded-full backdrop-blur text-[10px] font-mono text-slate-400 shadow-xl">
        <span className={telemetry.scale < 0.5 ? 'text-cyan-400 font-bold' : 'text-slate-600'}>
          1. GLOBAL ORBIT (&lt;0.5x)
        </span>
        <span className="text-slate-700">→</span>
        <span className={telemetry.scale >= 0.5 && telemetry.scale < 2.0 ? 'text-cyan-400 font-bold' : 'text-slate-600'}>
          2. REGIONAL FLIGHT (0.5x–2.0x)
        </span>
        <span className="text-slate-700">→</span>
        <span className={telemetry.scale >= 2.0 ? 'text-cyan-400 font-bold' : 'text-slate-600'}>
          3. URBAN DIVE (&gt;2.0x)
        </span>
      </div>
    </div>
  );
}
