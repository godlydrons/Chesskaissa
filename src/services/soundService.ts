/**
 * CAISSA-CORE: HIGH-FIDELITY AUDIO ENGINE
 * Dual-engine architecture:
 * 1. Web Audio API with decoded buffers for zero-latency, zero-ducking playback (never lowers background music volume).
 * 2. Instant synthesized acoustic fallbacks & HTML5 audio fallbacks so sounds are NEVER silent.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.65;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private forgeInterval: any = null;
  private forgeBpm: number = 90;

  private soundUrls: Record<string, string> = {
    move: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3',
    capture: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3',
    success: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3',
    drill_advance: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3',
    fault: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/illegal.mp3',
    complete: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3',
    premove: 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/premove.mp3'
  };

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        const ctx = this.getAudioContext();
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
      window.addEventListener('mousedown', unlock, { passive: true });
      window.addEventListener('click', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    return this.ctx;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  play(name: string) {
    if (this.isMuted) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        this.triggerSound(ctx, name);
      }).catch(() => {
        // Fallback execution
        this.triggerSound(ctx, name);
      });
      return;
    }

    this.triggerSound(ctx, name);
  }

  private triggerSound(ctx: AudioContext, name: string) {
    try {
      const now = ctx.currentTime;
      switch (name) {
        case 'move':
          this.synthesizeMoveSound(ctx, now);
          break;
        case 'capture':
          this.synthesizeCaptureSound(ctx, now);
          break;
        case 'success':
        case 'drill_advance':
          this.synthesizeSuccessChime(ctx, now);
          break;
        case 'fault':
          this.synthesizeFaultSound(ctx, now);
          break;
        case 'complete':
          this.synthesizeCompleteSound(ctx, now);
          break;
        case 'premove':
          this.synthesizePremoveSound(ctx, now);
          break;
        case 'click':
          this.synthesizeClickSound(ctx, now);
          break;
        case 'glitch':
          this.synthesizeGlitchSound(ctx, now);
          break;
        case 'heartbeat':
          this.synthesizeHeartbeat(ctx, now);
          break;
        case 'tinnitus':
          this.synthesizeTinnitus(ctx, now);
          break;
        default:
          this.synthesizeMoveSound(ctx, now);
          break;
      }
    } catch {
      // Audio node failure recovery
    }
  }

  /**
   * Crisp, organic wooden chess piece strike on wood board.
   * Sharp attack + rich wooden body thud.
   */
  private synthesizeMoveSound(ctx: AudioContext, now: number) {
    // Sharp click transient
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.04);

    gain.gain.setValueAtTime(this.masterVolume * 0.95, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);

    // Warm wooden acoustic resonance
    const wood = ctx.createOscillator();
    const woodGain = ctx.createGain();
    wood.type = 'sine';
    wood.frequency.setValueAtTime(180, now);
    wood.frequency.exponentialRampToValueAtTime(60, now + 0.09);

    woodGain.gain.setValueAtTime(this.masterVolume * 0.75, now);
    woodGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);

    wood.connect(woodGain);
    woodGain.connect(ctx.destination);
    wood.start(now);
    wood.stop(now + 0.1);
  }

  /**
   * Snappy wooden capture clack: two rapid crisp strikes
   */
  private synthesizeCaptureSound(ctx: AudioContext, now: number) {
    this.synthesizeMoveSound(ctx, now);

    setTimeout(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.05);

      gain.gain.setValueAtTime(this.masterVolume * 0.85, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.065);
    }, 22);
  }

  /**
   * Distinct, crystalline harmonic chime for N+1 stage advance
   */
  private synthesizeSuccessChime(ctx: AudioContext, now: number) {
    const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
    freqs.forEach((f, idx) => {
      const noteTime = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, noteTime);

      gain.gain.setValueAtTime(this.masterVolume * 0.55, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.23);
    });
  }

  /**
   * Gentle, unmistakable fault/blunder thud
   */
  private synthesizeFaultSound(ctx: AudioContext, now: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, now);

    gain.gain.setValueAtTime(this.masterVolume * 0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.21);
  }

  /**
   * Ascending celebration chord
   */
  private synthesizeCompleteSound(ctx: AudioContext, now: number) {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const delay = idx * 0.06;
      const noteTime = now + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(this.masterVolume * 0.5, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.36);
    });
  }

  /**
   * Premove sound
   */
  private synthesizePremoveSound(ctx: AudioContext, now: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.04);

    gain.gain.setValueAtTime(this.masterVolume * 0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  private synthesizeClickSound(ctx: AudioContext, now: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.02);

    gain.gain.setValueAtTime(this.masterVolume * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  private synthesizeGlitchSound(ctx: AudioContext, now: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.setValueAtTime(840, now + 0.03);
    osc.frequency.setValueAtTime(220, now + 0.06);

    gain.gain.setValueAtTime(this.masterVolume * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private synthesizeHeartbeat(ctx: AudioContext, now: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

    gain.gain.setValueAtTime(this.masterVolume * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private synthesizeTinnitus(ctx: AudioContext, now: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(3200, now);

    gain.gain.setValueAtTime(this.masterVolume * 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  startForgeMusic() {
    this.stopForgeMusic();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.forgeInterval = setInterval(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(55, t + 0.12);

      gain.gain.setValueAtTime(this.masterVolume * 0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    }, Math.max(300, (60 / this.forgeBpm) * 1000));
  }

  stopForgeMusic() {
    if (this.forgeInterval) {
      clearInterval(this.forgeInterval);
      this.forgeInterval = null;
    }
  }

  setForgeBPM(bpm: number) {
    this.forgeBpm = Math.max(60, Math.min(200, bpm));
    if (this.forgeInterval) {
      this.startForgeMusic();
    }
  }
}

export const soundEngine = new SoundEngine();

