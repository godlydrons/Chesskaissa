import React from 'react';
import { ChampionDna } from '../types/champion';
import { cn } from '../lib/utils';

interface ChampionRadarProps {
  championDna: ChampionDna;
  userDna?: ChampionDna;
  championName: string;
  className?: string;
  size?: number;
  showComparison?: boolean;
}

interface MetricAxis {
  key: keyof ChampionDna;
  label: string;
  angle: number; // in radians
}

const AXES: MetricAxis[] = [
  { key: 'initiative', label: 'Initiative', angle: -Math.PI / 2 },          // 12 o'clock
  { key: 'tactics', label: 'Tactics', angle: -Math.PI / 2 + (2 * Math.PI) / 5 },
  { key: 'dynamism', label: 'Dynamism', angle: -Math.PI / 2 + (4 * Math.PI) / 5 },
  { key: 'endgame', label: 'Endgame', angle: -Math.PI / 2 + (6 * Math.PI) / 5 },
  { key: 'prophylaxis', label: 'Prophylaxis', angle: -Math.PI / 2 + (8 * Math.PI) / 5 }
];

export function ChampionRadar({
  championDna,
  userDna,
  championName,
  className,
  size = 280,
  showComparison = true
}: ChampionRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) - 42; // Leave margin for labels

  // Helper to convert polar to cartesian
  const getCoordinates = (value: number, angle: number, maxVal = 100) => {
    const r = (value / maxVal) * radius;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return { x, y };
  };

  // Build polygon path string for a given DNA
  const getPolygonPath = (dna: ChampionDna) => {
    return AXES.map((axis) => {
      const val = dna[axis.key] || 50;
      const { x, y } = getCoordinates(val, axis.angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };

  const championPath = getPolygonPath(championDna);
  const userPath = userDna ? getPolygonPath(userDna) : null;

  // Concentric grid circles / polygons
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className={cn("flex flex-col items-center select-none", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
        >
          <defs>
            {/* Champion Gold Glow */}
            <linearGradient id="champGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#8A6E1E" stopOpacity="0.15" />
            </linearGradient>

            {/* User Cyan Glow */}
            <linearGradient id="userGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.2" />
            </linearGradient>

            <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Concentric Radar Polygons */}
          {gridLevels.map((lvl) => {
            const path = AXES.map(axis => {
              const { x, y } = getCoordinates(lvl * 100, axis.angle);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(' ');

            return (
              <polygon
                key={lvl}
                points={path}
                fill={lvl === 1.0 ? "rgba(255, 255, 255, 0.02)" : "none"}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth={lvl === 1.0 ? "1.5" : "0.75"}
                strokeDasharray={lvl < 1.0 ? "2,3" : "none"}
              />
            );
          })}

          {/* Radial Spokes from Center */}
          {AXES.map((axis) => {
            const { x, y } = getCoordinates(100, axis.angle);
            return (
              <line
                key={axis.key}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth="1"
              />
            );
          })}

          {/* 1. Champion Radar Polygon (Gold) */}
          <polygon
            points={championPath}
            fill="url(#champGrad)"
            stroke="#D4AF37"
            strokeWidth="2"
            filter="url(#radarGlow)"
            className="transition-all duration-700 ease-out"
          />

          {/* Champion Vertex Points */}
          {AXES.map((axis) => {
            const val = championDna[axis.key];
            const { x, y } = getCoordinates(val, axis.angle);
            return (
              <circle
                key={`champ-dot-${axis.key}`}
                cx={x}
                cy={y}
                r="3.5"
                fill="#D4AF37"
                stroke="#000"
                strokeWidth="1"
                className="transition-all duration-700"
              />
            );
          })}

          {/* 2. User Live DNA Polygon (Cyan) */}
          {showComparison && userPath && (
            <>
              <polygon
                points={userPath}
                fill="url(#userGrad)"
                stroke="#06b6d4"
                strokeWidth="2"
                strokeDasharray="3,2"
                className="transition-all duration-500 ease-out"
              />
              {AXES.map((axis) => {
                const val = userDna?.[axis.key] || 50;
                const { x, y } = getCoordinates(val, axis.angle);
                return (
                  <circle
                    key={`user-dot-${axis.key}`}
                    cx={x}
                    cy={y}
                    r="3"
                    fill="#06b6d4"
                    stroke="#fff"
                    strokeWidth="1"
                    className="transition-all duration-500"
                  />
                );
              })}
            </>
          )}

          {/* Metric Labels & Values */}
          {AXES.map((axis) => {
            const labelDist = radius + 22;
            const lx = cx + labelDist * Math.cos(axis.angle);
            const ly = cy + labelDist * Math.sin(axis.angle);
            const champVal = championDna[axis.key];
            const userVal = userDna ? userDna[axis.key] : null;

            return (
              <g key={`label-${axis.key}`}>
                <text
                  x={lx}
                  y={ly - 4}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white/70 text-[9px] font-mono font-bold uppercase tracking-wider"
                >
                  {axis.label}
                </text>
                <text
                  x={lx}
                  y={ly + 8}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-tritium-gold text-[8.5px] font-mono font-black"
                >
                  {champVal}%
                  {showComparison && userVal !== null && (
                    <tspan className="fill-cyan-400 font-normal"> / {userVal}%</tspan>
                  )}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend Footer */}
      <div className="flex items-center gap-4 text-[10px] font-mono mt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-tritium-gold/80 border border-tritium-gold" />
          <span className="text-white/80 font-bold">{championName} DNA</span>
        </div>
        {showComparison && userDna && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400/80 border border-cyan-400" />
            <span className="text-cyan-300 font-bold">Your Live Instinct</span>
          </div>
        )}
      </div>
    </div>
  );
}
