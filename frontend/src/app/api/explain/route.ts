/**
 * POST /api/explain
 * Calls the Grok (xAI) API to generate a chess coaching explanation
 * for why a move was a mistake and what should have been played instead.
 */
import OpenAI from 'openai'

const SYSTEM_PROMPT = `You are a friendly and encouraging chess coach. Your student just made a mistake in their game. Your job is to explain:

1. Why their move was a mistake (what it allows the opponent to do).
2. Why the suggested best move is better.
3. A simple, memorable takeaway they can apply in future games.

Keep your explanation concise (2-4 sentences). Use plain language that a beginner could understand. Refer to pieces by name, not algebraic notation where possible. Do not be condescending.`

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { fen, userMove, bestMove, moveProbs } = body as {
    fen?: string
    userMove?: string
    bestMove?: string
    moveProbs?: Record<string, number>
  }

  // Validate required fields
  if (!fen) {
    return Response.json({ error: 'Missing required field: fen' }, { status: 400 })
  }
  if (!userMove) {
    return Response.json({ error: 'Missing required field: userMove' }, { status: 400 })
  }
  if (!bestMove) {
    return Response.json({ error: 'Missing required field: bestMove' }, { status: 400 })
  }

  // Build the user message with chess context
  let userContent = `Position (FEN): ${fen}\nPlayer's move: ${userMove}\nSuggested best move: ${bestMove}`

  if (moveProbs && Object.keys(moveProbs).length > 0) {
    const topMoves = Object.entries(moveProbs)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([move, prob]) => `${move}: ${prob}`)
      .join(', ')
    userContent += `\nTop move probabilities: ${topMoves}`
  }

  userContent += `\n\nExplain why the player's move was a mistake and why the best move is better.`

  try {
    const client = new OpenAI({
      apiKey: process.env.GROK_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    })

    const stream = await client.chat.completions.create({
      model: 'grok-4',
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    })

    // Convert the OpenAI stream to a ReadableStream
    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content
          if (content) {
            controller.enqueue(encoder.encode(content))
          }
        }
        controller.close()
      },
    })

    return new Response(readableStream, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: `Grok API error: ${message}` }, { status: 500 })
  }
}
