import { ChampionPersona, ChampionGameRecord, ChampionMomentRecord, ChampionId, UserCognitiveStats } from '../types/champion';
import { CHAMPION_PERSONAS, MASTER_GAMES } from '../data/championData';

const LOCAL_STORAGE_KEY = 'caissa_cognitive_shadowing_v2';

class ChampionService {
  private personas: ChampionPersona[] = CHAMPION_PERSONAS;
  private games: ChampionGameRecord[] = MASTER_GAMES;
  private stats: Record<string, UserCognitiveStats> = {};

  constructor() {
    this.loadStats();
  }

  private loadStats() {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          this.stats = JSON.parse(saved);
        }
      }
    } catch (e) {
      console.warn('Failed to load stats from localStorage', e);
    }
  }

  private saveStats() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.stats));
      }
    } catch (e) {
      console.warn('Failed to save stats to localStorage', e);
    }
  }

  getPersonas(): ChampionPersona[] {
    return this.personas;
  }

  getPersona(id: ChampionId): ChampionPersona {
    return this.personas.find(p => p.id === id) || this.personas[0];
  }

  getGamesForPersona(championId: ChampionId): ChampionGameRecord[] {
    return this.games.filter(g => g.championId === championId);
  }

  getGame(gameId: string): ChampionGameRecord | undefined {
    return this.games.find(g => g.id === gameId);
  }

  recordGuess(gameId: string, isChampionMove: boolean, wasPunished: boolean): UserCognitiveStats {
    if (!this.stats[gameId]) {
      this.stats[gameId] = {
        gameId,
        momentsEncountered: 0,
        momentsSolvedFirstTry: 0,
        punishmentBranchesTriggered: 0,
        alignmentScore: 100
      };
    }

    const current = this.stats[gameId];
    current.momentsEncountered += 1;
    if (isChampionMove && !wasPunished) {
      current.momentsSolvedFirstTry += 1;
    }
    if (wasPunished) {
      current.punishmentBranchesTriggered += 1;
    }

    current.alignmentScore = Math.max(10, Math.min(100, Math.round(
      (current.momentsSolvedFirstTry / Math.max(1, current.momentsEncountered)) * 100 - (current.punishmentBranchesTriggered * 5)
    )));

    this.saveStats();
    return current;
  }

  getStats(gameId: string): UserCognitiveStats {
    return this.stats[gameId] || {
      gameId,
      momentsEncountered: 0,
      momentsSolvedFirstTry: 0,
      punishmentBranchesTriggered: 0,
      alignmentScore: 100
    };
  }

  addCustomGame(newGame: ChampionGameRecord) {
    this.games = [newGame, ...this.games];
  }
}

export const championService = new ChampionService();
