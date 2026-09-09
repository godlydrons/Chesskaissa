export interface MatrixNode {
  moves: Record<string, string>; // Key: SAN move (e.g., "Nf3"), Value: Next FEN string
  provinces: string[];           // Which chapters this node belongs to
}

export type NeuralMatrix = Record<string, MatrixNode>;
