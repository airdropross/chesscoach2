/**
 * Phase 3 — Intervention Logic (Blunder Detection)
 *
 * Compares win probability before and after a user's move to detect mistakes.
 * Win probability is always from white's perspective (0–1, from Maia2).
 */

export type CoachStrictness = 'strict' | 'standard' | 'forgiving'

/** How much win-prob drop triggers an intervention at each strictness level */
export const STRICTNESS_THRESHOLDS: Record<CoachStrictness, number> = {
  strict: 0.05,    // Inaccuracy: 5%+ drop
  standard: 0.10,  // Mistake: 10%+ drop
  forgiving: 0.20, // Blunder: 20%+ drop
}

export interface InterventionState {
  isActive: boolean
  fenBeforeMove: string | null   // FEN before the blundered move (for undo)
  userMove: string | null        // SAN notation of the blundered move (e.g. "h3")
  userMoveFrom: string | null    // Square the piece came from (e.g. "h2")
  userMoveTo: string | null      // Square the piece went to (e.g. "h3")
  previousWinProb: number | null
  newWinProb: number | null
  bestMove: string | null        // Maia2's recommended move in UCI (e.g. "g1f3")
  moveProbs: Record<string, number> | null // Move probability distribution
}

export function createInitialInterventionState(): InterventionState {
  return {
    isActive: false,
    fenBeforeMove: null,
    userMove: null,
    userMoveFrom: null,
    userMoveTo: null,
    previousWinProb: null,
    newWinProb: null,
    bestMove: null,
    moveProbs: null,
  }
}

/**
 * Calculate the win-probability drop FROM THE MOVING PLAYER'S PERSPECTIVE.
 *
 * winProb is always from white's perspective:
 *   - If player is white: drop = previous - current  (their number went down)
 *   - If player is black: drop = current - previous  (white's number went UP = bad for black)
 */
export function calculateWinProbDrop(
  previousWinProb: number,
  newWinProb: number,
  playerColor: 'w' | 'b'
): number {
  if (playerColor === 'w') {
    return previousWinProb - newWinProb
  } else {
    return newWinProb - previousWinProb
  }
}

/**
 * Determine whether the move constitutes a blunder given the threshold.
 */
export function isBlunder(
  previousWinProb: number,
  newWinProb: number,
  playerColor: 'w' | 'b',
  threshold: number
): boolean {
  const drop = calculateWinProbDrop(previousWinProb, newWinProb, playerColor)
  return drop >= threshold
}

/**
 * Returns a friendly intervention message scaled by severity.
 */
export function getInterventionMessage(drop: number): string {
  if (drop >= 0.20) return "Hold on, that's a serious mistake!"
  if (drop >= 0.10) return "Hold on, that's a mistake."
  return "Wait — that move could be better."
}
