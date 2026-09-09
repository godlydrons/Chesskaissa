/**
 * CAISSA-CORE: GLOBAL THEME DEFINITIONS
 * Aesthetic: Dark Luxury
 * Purpose: Military-grade cognitive telemetry for tournament chess.
 */

export const THEME = {
  colors: {
    background: {
      void: '#000000', // Vantablack
      surface: '#05050A', // OLED Black
    },
    action: {
      primary: '#D4AF37', // Tritium Gold
    },
    state: {
      mastery: '#2ECC71', // Terminal Green
      decay: '#E74C3C', // Molten Copper / Crimson
    },
    shadow: {
      counterMeasure: '#0047AB', // Electric Cobalt Blue
    },
    topo: {
      land: {
        initiative: 'rgba(212, 175, 55, 0.01)',
        counter: 'rgba(0, 71, 171, 0.01)',
      },
      border: {
        initiative: 'rgba(212, 175, 55, 0.1)',
        counter: 'rgba(0, 71, 171, 0.1)',
      },
    },
  },
  typography: {
    ui: {
      header: 'Inter', // Weight: 900
    },
    data: {
      telemetry: 'JetBrains Mono', // Weight: 500
    },
  },
  // Extended tokens for app functionality
  spatial: {
    borderRadius: '8px',
    blur: '24px',
    zMatrix: -10,
    zUI: 0,
    zNav: 100,
  },
  physics: {
    instant: { type: 'spring', stiffness: 1000, damping: 100, mass: 1 },
    heavy: { type: 'spring', stiffness: 300, damping: 30, mass: 2 },
  }
} as const;

export type CaissaTheme = typeof THEME;
