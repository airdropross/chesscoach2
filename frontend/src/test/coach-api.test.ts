import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

import { fetchExplanation, type ExplainRequest } from '../lib/coach-api'

/** Creates a mock Response with a single-chunk ReadableStream body */
function createMockResponse(text: string) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text))
      controller.close()
    },
  })

  return {
    ok: true,
    status: 200,
    body: stream,
  }
}

/** Creates a mock Response with a multi-chunk ReadableStream body */
function createMockStreamResponse(chunks: string[]) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })

  return {
    ok: true,
    status: 200,
    body: stream,
  }
}

describe('fetchExplanation', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const validRequest: ExplainRequest = {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    userMove: 'e2e3',
    bestMove: 'e2e4',
    moveProbs: { e2e4: 0.18, d2d4: 0.15, e2e3: 0.02 },
  }

  it('should POST to /api/explain with correct body', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse('Explanation text'))

    await fetchExplanation(validRequest)

    expect(mockFetch).toHaveBeenCalledWith('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validRequest),
    })
  })

  it('should return the full explanation text', async () => {
    mockFetch.mockResolvedValueOnce(
      createMockResponse('Moving your knight there hangs your bishop.')
    )

    const result = await fetchExplanation(validRequest)

    expect(result).toBe('Moving your knight there hangs your bishop.')
  })

  it('should concatenate all streamed chunks into the final result', async () => {
    const chunks = ['Moving your ', 'knight there ', 'hangs your bishop.']
    mockFetch.mockResolvedValueOnce(createMockStreamResponse(chunks))

    const result = await fetchExplanation(validRequest)

    expect(result).toBe('Moving your knight there hangs your bishop.')
  })

  it('should call onChunk callback for each streamed chunk', async () => {
    const chunks = ['Moving ', 'your knight ', 'hangs your bishop.']
    mockFetch.mockResolvedValueOnce(createMockStreamResponse(chunks))

    const onChunk = vi.fn()
    await fetchExplanation(validRequest, onChunk)

    expect(onChunk).toHaveBeenCalledTimes(3)
    expect(onChunk).toHaveBeenNthCalledWith(1, 'Moving ')
    expect(onChunk).toHaveBeenNthCalledWith(2, 'your knight ')
    expect(onChunk).toHaveBeenNthCalledWith(3, 'hangs your bishop.')
  })

  it('should work without onChunk callback', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse('Simple explanation'))

    const result = await fetchExplanation(validRequest)

    expect(result).toBe('Simple explanation')
  })

  it('should throw on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    await expect(fetchExplanation(validRequest)).rejects.toThrow()
  })

  it('should throw on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    await expect(fetchExplanation(validRequest)).rejects.toThrow('Network error')
  })

  it('should send request without moveProbs when not provided', async () => {
    const { moveProbs: _, ...requestWithoutProbs } = validRequest
    mockFetch.mockResolvedValueOnce(createMockResponse('Explanation'))

    await fetchExplanation(requestWithoutProbs)

    expect(mockFetch).toHaveBeenCalledWith('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestWithoutProbs),
    })
  })
})

describe('ExplainRequest type', () => {
  it('should have all required fields', () => {
    const request: ExplainRequest = {
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      userMove: 'e2e3',
      bestMove: 'e2e4',
    }

    expect(request.fen).toBeDefined()
    expect(request.userMove).toBeDefined()
    expect(request.bestMove).toBeDefined()
  })

  it('should accept optional moveProbs', () => {
    const request: ExplainRequest = {
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      userMove: 'e2e3',
      bestMove: 'e2e4',
      moveProbs: { e2e4: 0.18, d2d4: 0.15 },
    }

    expect(request.moveProbs).toBeDefined()
  })
})
