/**
 * CAISSA-CORE: INDEXED-DB LAYER
 * High-performance asynchronous storage for massive PGN datasets and user repertoires.
 */

export interface StoredVariation {
  id: string;
  name: string;
  pgn: string;
  eco?: string;
  moves: number;
}

export interface StoredRepertoire {
  id: string;
  name: string;
  color: 'white' | 'black';
  rawPgn: string;
  lineCount: number;
  createdAt: number;
  variations: StoredVariation[];
}

export interface StoredPgnGame {
  id: string;
  white: string;
  black: string;
  result: string;
  event: string;
  date: string;
  pgn: string;
  moveCount: number;
  preview: string;
  addedAt: number;
  sideToPlay?: 'w' | 'b';
}

export interface StoredMasterCard {
  id: string;
  name: string; // File name, e.g. "Sicilian_Defense.pgn"
  fileName: string;
  fileSize?: number;
  totalGames: number;
  createdAt: number;
  games: StoredPgnGame[];
  sideToPlay?: 'w' | 'b';
}

const DB_NAME = 'caissa_vault_db';
const STORE_NAME = 'repertoires';
const GAMES_STORE = 'pgn_games';
const MASTER_CARDS_STORE = 'master_cards';
const DB_VERSION = 3;

export class VaultDB {
  private static db: IDBDatabase | null = null;

  static async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(GAMES_STORE)) {
          db.createObjectStore(GAMES_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(MASTER_CARDS_STORE)) {
          const mcStore = db.createObjectStore(MASTER_CARDS_STORE, { keyPath: 'id' });
          mcStore.createIndex('name', 'name', { unique: false });
          mcStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  // Master Cards API
  static async saveMasterCard(card: StoredMasterCard): Promise<void> {
    const database = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([MASTER_CARDS_STORE], 'readwrite');
      const store = transaction.objectStore(MASTER_CARDS_STORE);
      const request = store.put(card);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async saveMasterCards(cards: StoredMasterCard[]): Promise<void> {
    if (!cards.length) return;
    const database = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([MASTER_CARDS_STORE], 'readwrite');
      const store = transaction.objectStore(MASTER_CARDS_STORE);
      cards.forEach(c => store.put(c));
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => reject((event.target as IDBTransaction).error);
    });
  }

  static async getAllMasterCards(): Promise<StoredMasterCard[]> {
    const database = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([MASTER_CARDS_STORE], 'readonly');
      const store = transaction.objectStore(MASTER_CARDS_STORE);
      const request = store.getAll();

      request.onsuccess = async () => {
        let cards: StoredMasterCard[] = request.result || [];
        // Legacy fallback: if no master cards exist, check if legacy GAMES_STORE has items
        if (cards.length === 0) {
          try {
            const legacyGames = await VaultDB.getAllGames();
            if (legacyGames && legacyGames.length > 0) {
              const migratedCard: StoredMasterCard = {
                id: 'master-legacy-default',
                name: 'Master_Repertoire.pgn',
                fileName: 'Master_Repertoire.pgn',
                totalGames: legacyGames.length,
                createdAt: Date.now(),
                games: legacyGames
              };
              await VaultDB.saveMasterCard(migratedCard);
              cards = [migratedCard];
            }
          } catch {
            // ignore fallback error
          }
        }
        resolve(cards);
      };
      request.onerror = () => reject(request.error);
    });
  }

  static async getMasterCard(id: string): Promise<StoredMasterCard | null> {
    const database = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([MASTER_CARDS_STORE], 'readonly');
      const store = transaction.objectStore(MASTER_CARDS_STORE);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  static async deleteMasterCard(id: string): Promise<void> {
    const database = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([MASTER_CARDS_STORE], 'readwrite');
      const store = transaction.objectStore(MASTER_CARDS_STORE);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async updateMasterCardGames(cardId: string, games: StoredPgnGame[]): Promise<void> {
    const card = await this.getMasterCard(cardId);
    if (!card) return;
    card.games = games;
    card.totalGames = games.length;
    await this.saveMasterCard(card);
  }

  static async updateMasterCardSideToPlay(cardId: string, side: 'w' | 'b'): Promise<void> {
    const card = await this.getMasterCard(cardId);
    if (!card) return;
    card.sideToPlay = side;
    card.games = card.games.map(g => ({ ...g, sideToPlay: side }));
    await this.saveMasterCard(card);
  }

  static async saveRepertoire(rep: StoredRepertoire): Promise<void> {
    const database = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(rep);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async getAllRepertoires(): Promise<StoredRepertoire[]> {
    const database = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  static async getRepertoire(id: string): Promise<StoredRepertoire | null> {
    const database = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  static async deleteRepertoire(id: string): Promise<void> {
    const database = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async deleteVariation(repertoireId: string, variationId: string): Promise<StoredRepertoire | null> {
    const rep = await this.getRepertoire(repertoireId);
    if (!rep) return null;

    const remaining = rep.variations.filter(v => v.id !== variationId);
    const updatedRawPgn = remaining.map(v => v.pgn).join('\n\n');
    const updated: StoredRepertoire = {
      ...rep,
      lineCount: remaining.length,
      rawPgn: updatedRawPgn,
      variations: remaining
    };

    await this.saveRepertoire(updated);
    return updated;
  }

  static async clearAllRepertoires(): Promise<void> {
    const database = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async saveGames(games: any[]): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([GAMES_STORE], 'readwrite');
      const store = transaction.objectStore(GAMES_STORE);

      games.forEach(game => {
        store.put(game);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => reject((event.target as IDBTransaction).error);
    });
  }

  static async getAllGames(): Promise<any[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([GAMES_STORE], 'readonly');
      const store = transaction.objectStore(GAMES_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  static async deleteGame(id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([GAMES_STORE], 'readwrite');
      const store = transaction.objectStore(GAMES_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject((event.target as IDBRequest).error);
    });
  }

  static async deleteGames(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([GAMES_STORE], 'readwrite');
      const store = transaction.objectStore(GAMES_STORE);
      ids.forEach(id => store.delete(id));
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => reject((event.target as IDBTransaction).error);
    });
  }

  static async clearAll(): Promise<void> {
    const database = await this.init();
    return new Promise((resolve, reject) => {
      const stores = [STORE_NAME, GAMES_STORE];
      if (database.objectStoreNames.contains(MASTER_CARDS_STORE)) {
        stores.push(MASTER_CARDS_STORE);
      }
      const transaction = database.transaction(stores, 'readwrite');
      stores.forEach(s => transaction.objectStore(s).clear());
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => reject((event.target as IDBTransaction).error);
    });
  }
}

export const db = {
  saveRepertoire: (rep: StoredRepertoire) => VaultDB.saveRepertoire(rep),
  getAllRepertoires: () => VaultDB.getAllRepertoires(),
  getRepertoire: (id: string) => VaultDB.getRepertoire(id),
  deleteRepertoire: (id: string) => VaultDB.deleteRepertoire(id),
  deleteVariation: (repId: string, varId: string) => VaultDB.deleteVariation(repId, varId),
  clearAllRepertoires: () => VaultDB.clearAllRepertoires(),
  deleteGame: (id: string) => VaultDB.deleteGame(id),
  deleteGames: (ids: string[]) => VaultDB.deleteGames(ids),
  clearAll: () => VaultDB.clearAll(),
};
