/**
 * Coach API Service Layer
 * Client-side functions for calling the /api/explain route
 * and consuming the streamed LLM response.
 */

export interface ExplainRequest {
  /** Board state in FEN notation */
  fen: string
  /** The mistake move in UCI notation (e.g., "e2e3") */
  userMove: string
  /** The best move in UCI notation (e.g., "e2e4") */
  bestMove: string
  /** Optional move probabilities from Maia2 */
  moveProbs?: Record<string, number>
}

/**
 * Calls the /api/explain endpoint and streams the coaching explanation.
 *
 * @param params - The explain request with fen, userMove, bestMove, and optional moveProbs
 * @param onChunk - Optional callback fired for each streamed text chunk (for real-time UI updates)
 * @returns The full explanation text
 */
export async function fetchExplanation(
  params: ExplainRequest,
  onChunk?: (text: string) => void
): Promise<string> {
  const response = await fetch('/api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error(`Explain API error: ${response.status} ${response.statusText}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let result = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value, { stream: true })
    result += text

    if (onChunk) {
      onChunk(text)
    }
  }

  return result
}
