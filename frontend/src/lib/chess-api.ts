/**
 * Maia2 Model Service Layer
 * Connects to local Maia2 model server for human-like move prediction
 */

const API_URL = 'http://localhost:5001/predict'

export interface AnalysisResult {
  /** Best move in UCI notation (e.g., "e2e4") */
  bestMove: string
  /** Source square (e.g., "e2") */
  from: string
  /** Target square (e.g., "e4") */
  to: string
  /** Win probability (0-1, always from white's perspective) */
  winProbability: number
  /** All legal moves with their predicted probabilities */
  moves: Record<string, number>
}

export interface FetchAnalysisOptions {
  /** ELO rating of the player to move (default 1500) */
  eloSelf?: number
  /** ELO rating of the opponent (default 1500) */
  eloOppo?: number
}

/** Raw response from Maia2 model server */
interface Maia2Response {
  best_move: string
  win_probability: number
  moves: Record<string, number>
  error?: string
}

/**
 * Fetches position analysis from the local Maia2 model server
 * @param fen - The FEN string of the position to analyze
 * @param options - Optional parameters like elo ratings
 * @returns Analysis result with best move, win probability, and move probabilities
 */
export async function fetchAnalysis(
  fen: string,
  options?: FetchAnalysisOptions
): Promise<AnalysisResult> {
  const body: Record<string, unknown> = { fen }

  if (options?.eloSelf) body.elo_self = options.eloSelf
  if (options?.eloOppo) body.elo_oppo = options.eloOppo

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Maia2 API error: ${response.status} ${response.statusText}`)
  }

  const data: Maia2Response = await response.json()

  if (data.error) {
    throw new Error(`Maia2 model error: ${data.error}`)
  }

  // Extract from/to from UCI move (e.g., "e2e4" -> from: "e2", to: "e4")
  const from = data.best_move.slice(0, 2)
  const to = data.best_move.slice(2, 4)

  return {
    bestMove: data.best_move,
    from,
    to,
    winProbability: data.win_probability,
    moves: data.moves,
  }
}
