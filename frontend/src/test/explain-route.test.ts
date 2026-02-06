import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the openai module
const mockCreate = vi.fn()
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: mockCreate,
      },
    }
  },
}))

// Set env before importing the route
vi.stubEnv('GROK_API_KEY', 'test-xai-key')

import { POST } from '../app/api/explain/route'

/** Helper to build a mock Request */
function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Creates a mock async-iterable stream mimicking the OpenAI SDK streaming response */
function createMockStream(...chunks: string[]) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const chunk of chunks) {
        yield {
          choices: [{ delta: { content: chunk } }],
        }
      }
    },
  }
}

/** Read a ReadableStream to a string */
async function readStream(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let result = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    result += decoder.decode(value, { stream: true })
  }

  return result
}

describe('POST /api/explain', () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  const validBody = {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    userMove: 'e2e3',
    bestMove: 'e2e4',
    moveProbs: { e2e4: 0.18, d2d4: 0.15, e2e3: 0.02 },
  }

  // --- Input validation ---

  it('should return 400 if fen is missing', async () => {
    const { fen: _, ...body } = validBody
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/fen/i)
  })

  it('should return 400 if userMove is missing', async () => {
    const { userMove: _, ...body } = validBody
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/userMove/i)
  })

  it('should return 400 if bestMove is missing', async () => {
    const { bestMove: _, ...body } = validBody
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/bestMove/i)
  })

  // --- Grok API call ---

  it('should call Grok API with grok-4 model', async () => {
    mockCreate.mockResolvedValueOnce(createMockStream('Explanation'))

    await POST(makeRequest(validBody))

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'grok-4' })
    )
  })

  it('should enable streaming', async () => {
    mockCreate.mockResolvedValueOnce(createMockStream('Explanation'))

    await POST(makeRequest(validBody))

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ stream: true })
    )
  })

  it('should include a chess coaching system prompt', async () => {
    mockCreate.mockResolvedValueOnce(createMockStream('Explanation'))

    await POST(makeRequest(validBody))

    const callArgs = mockCreate.mock.calls[0][0]
    const systemMessage = callArgs.messages.find(
      (m: { role: string }) => m.role === 'system'
    )

    expect(systemMessage).toBeDefined()
    expect(systemMessage.content.length).toBeGreaterThan(0)
  })

  it('should include fen, userMove, and bestMove in the user message', async () => {
    mockCreate.mockResolvedValueOnce(createMockStream('Explanation'))

    await POST(makeRequest(validBody))

    const callArgs = mockCreate.mock.calls[0][0]
    const userMessage = callArgs.messages.find(
      (m: { role: string }) => m.role === 'user'
    )

    expect(userMessage).toBeDefined()
    expect(userMessage.content).toContain(validBody.fen)
    expect(userMessage.content).toContain(validBody.userMove)
    expect(userMessage.content).toContain(validBody.bestMove)
  })

  it('should include moveProbs in the prompt when provided', async () => {
    mockCreate.mockResolvedValueOnce(createMockStream('Explanation'))

    await POST(makeRequest(validBody))

    const callArgs = mockCreate.mock.calls[0][0]
    const userMessage = callArgs.messages.find(
      (m: { role: string }) => m.role === 'user'
    )

    // Should reference the best move probability
    expect(userMessage.content).toContain('0.18')
  })

  // --- Streaming response ---

  it('should return a streaming response with status 200', async () => {
    mockCreate.mockResolvedValueOnce(createMockStream('Great explanation'))

    const res = await POST(makeRequest(validBody))

    expect(res.status).toBe(200)
    expect(res.body).toBeInstanceOf(ReadableStream)
  })

  it('should stream the LLM response text through the body', async () => {
    const chunks = ['Moving your ', 'knight there ', 'hangs your bishop.']
    mockCreate.mockResolvedValueOnce(createMockStream(...chunks))

    const res = await POST(makeRequest(validBody))
    const text = await readStream(res.body!)

    expect(text).toBe('Moving your knight there hangs your bishop.')
  })

  // --- Without optional fields ---

  it('should work without moveProbs', async () => {
    const { moveProbs: _, ...bodyWithoutProbs } = validBody
    mockCreate.mockResolvedValueOnce(createMockStream('Still works'))

    const res = await POST(makeRequest(bodyWithoutProbs))

    expect(res.status).toBe(200)
  })

  // --- Error handling ---

  it('should return 500 if Grok API call fails', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Rate limit exceeded'))

    const res = await POST(makeRequest(validBody))

    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBeDefined()
  })

  it('should handle stream chunks with empty content gracefully', async () => {
    const stream = {
      [Symbol.asyncIterator]: async function* () {
        yield { choices: [{ delta: { content: 'Hello' } }] }
        yield { choices: [{ delta: {} }] } // no content key
        yield { choices: [{ delta: { content: ' world' } }] }
      },
    }
    mockCreate.mockResolvedValueOnce(stream)

    const res = await POST(makeRequest(validBody))
    const text = await readStream(res.body!)

    expect(text).toBe('Hello world')
  })
})
