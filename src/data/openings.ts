export interface OpeningLine {
  id: string;
  name: string;
  moves: string[]; // Standard Algebraic Notation (SAN)
  userColor: 'w' | 'b';
  repertoireName?: string;
}

export const LOCAL_REPERTOIRE: OpeningLine[] = [
  {
    id: 'najdorf-6-be3-e6',
    repertoireName: 'Sicilian Najdorf',
    name: 'English Attack: Main Line',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e6', 'f3', 'Be7', 'Qd2', 'O-O', 'O-O-O'],
    userColor: 'b',
  },
  {
    id: 'najdorf-6-be3-e5',
    repertoireName: 'Sicilian Najdorf',
    name: 'English Attack: Perenyi Gambit',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e6', 'g4', 'e5', 'Nf5', 'g6', 'g5'],
    userColor: 'b',
  },
  {
    id: 'ruy-lopez-closed',
    repertoireName: 'Ruy Lopez',
    name: 'Closed Defense: Main Line',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O'],
    userColor: 'w',
  },
  {
    id: 'caro-kann-advance-tal',
    repertoireName: 'Caro-Kann',
    name: 'Advance Variation: Tal Variation',
    moves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'h4', 'h5', 'c4', 'e6', 'Nc3', 'Nd7'],
    userColor: 'w',
  }
];
