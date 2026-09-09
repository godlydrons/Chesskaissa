/**
 * CAISSA COGNITIVE SHADOWING: TTS SYNTHESIZER
 * Native device speech synthesis manager with strict priority queue
 * and interrupt safety rules to eliminate audio clipping or overlapping playback.
 */

class TextToSpeechService {
  private isEnabled: boolean = true;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private availableVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  private loadVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.availableVoices = window.speechSynthesis.getVoices();
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.cancel();
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Stop active speech immediately to prevent overlaps or clipping.
   */
  public cancel() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn('SpeechSynthesis cancel error', e);
      }
      this.currentUtterance = null;
    }
  }

  /**
   * Speak a narrative segment with champion-specific pitch & cadence.
   * Cancels any pending/ongoing speech to enforce audio priority.
   */
  public speak(
    text: string, 
    options?: { 
      pitch?: number; 
      rate?: number; 
      onEnd?: () => void;
      priority?: 'HIGH' | 'NORMAL';
    }
  ) {
    if (!this.isEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (options?.onEnd) options.onEnd();
      return;
    }

    // Strict priority: Cancel prior speech immediately
    this.cancel();

    // Clean text: strip markdown symbols, asterisks, brackets
    const cleanText = text
      .replace(/\[.*?\]/g, '')
      .replace(/\*\*/g, '')
      .replace(/!!/g, '!')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.pitch = options?.pitch ?? 1.0;
      utterance.rate = options?.rate ?? 1.0;

      // Select a clear English voice if available
      if (this.availableVoices.length > 0) {
        const preferredVoice = this.availableVoices.find(
          v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David') || v.name.includes('Alex'))
        ) || this.availableVoices.find(v => v.lang.startsWith('en'));
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        if (options?.onEnd) options.onEnd();
      };

      utterance.onerror = (err) => {
        console.warn('TTS playback error', err);
        this.currentUtterance = null;
        if (options?.onEnd) options.onEnd();
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Failed to invoke SpeechSynthesis', err);
      if (options?.onEnd) options.onEnd();
    }
  }
}

export const ttsService = new TextToSpeechService();
