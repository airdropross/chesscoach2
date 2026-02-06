import { Chess } from "chess.js";

// Piece values for material calculation
export const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export interface MaterialInfo {
  whiteMaterial: number;
  blackMaterial: number;
  advantage: number;
  whiteCaptured: string[];
  blackCaptured: string[];
}

/**
 * Calculate material and captured pieces for a chess position
 */
export function calculateMaterial(game: Chess): MaterialInfo {
  const board = game.board();
  const whitePieces: Record<string, number> = { q: 0, r: 0, b: 0, n: 0, p: 0, k: 0 };
  const blackPieces: Record<string, number> = { q: 0, r: 0, b: 0, n: 0, p: 0, k: 0 };
  
  // Count pieces on board
  for (const row of board) {
    for (const square of row) {
      if (square && square.type !== "k") {
        if (square.color === "w") {
          whitePieces[square.type]++;
        } else {
          blackPieces[square.type]++;
        }
      }
    }
  }
  
  // Starting piece counts
  const startingPieces = { q: 1, r: 2, b: 2, n: 2, p: 8 };
  
  // Calculate captured pieces
  const whiteCaptured: string[] = [];
  const blackCaptured: string[] = [];
  
  for (const [piece, startCount] of Object.entries(startingPieces)) {
    const whiteLost = startCount - whitePieces[piece];
    const blackLost = startCount - blackPieces[piece];
    
    for (let i = 0; i < whiteLost; i++) blackCaptured.push(`w${piece.toUpperCase()}`);
    for (let i = 0; i < blackLost; i++) whiteCaptured.push(`b${piece.toUpperCase()}`);
  }
  
  // Sort by value
  const sortOrder = ["Q", "R", "B", "N", "P"];
  const sortFn = (a: string, b: string) => sortOrder.indexOf(a[1]) - sortOrder.indexOf(b[1]);
  whiteCaptured.sort(sortFn);
  blackCaptured.sort(sortFn);
  
  // Calculate material values
  let whiteMaterial = 0;
  let blackMaterial = 0;
  
  for (const [piece, count] of Object.entries(whitePieces)) {
    whiteMaterial += PIECE_VALUES[piece] * count;
  }
  for (const [piece, count] of Object.entries(blackPieces)) {
    blackMaterial += PIECE_VALUES[piece] * count;
  }
  
  return {
    whiteMaterial,
    blackMaterial,
    advantage: whiteMaterial - blackMaterial,
    whiteCaptured,
    blackCaptured,
  };
}

/**
 * Format time in seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Check if a square color is light
 */
export function isLightSquare(col: number, row: number): boolean {
  return (col + row) % 2 === 0;
}
