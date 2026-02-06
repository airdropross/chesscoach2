import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchAnalysis, type AnalysisResult } from '../lib/chess-api'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('fetchAnalysis', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  it('should send POST request to Maia2 server with correct FEN', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        best_move: 'e2e4',
        win_probability: 0.53,
        moves: { e2e4: 0.18, d2d4: 0.15, g1f3: 0.09 },
      }),
    })

    await fetchAnalysis(STARTING_FEN)

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:5001/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fen: STARTING_FEN }),
    })
  })

  it('should parse Maia2 response correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        best_move: 'g1f3',
        win_probability: 0.55,
        moves: { g1f3: 0.22, e2e4: 0.18, d2d4: 0.15 },
      }),
    })

    const result = await fetchAnalysis(STARTING_FEN)

    expect(result.bestMove).toBe('g1f3')
    expect(result.from).toBe('g1')
    expect(result.to).toBe('f3')
    expect(result.winProbability).toBe(0.55)
    expect(result.moves).toEqual({ g1f3: 0.22, e2e4: 0.18, d2d4: 0.15 })
  })

  it('should handle low win probability (opponent advantage)', async () => {
    const blackAdvFEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        best_move: 'e7e5',
        win_probability: 0.48,
        moves: { e7e5: 0.20, d7d5: 0.18, c7c5: 0.12 },
      }),
    })

    const result = await fetchAnalysis(blackAdvFEN)

    expect(result.winProbability).toBe(0.48)
    expect(result.bestMove).toBe('e7e5')
  })

  it('should throw error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    await expect(fetchAnalysis(STARTING_FEN)).rejects.toThrow('Network error')
  })

  it('should throw error on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    await expect(fetchAnalysis(STARTING_FEN)).rejects.toThrow()
  })

  it('should throw error when Maia2 returns error field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        error: 'Invalid FEN',
      }),
    })

    await expect(fetchAnalysis(STARTING_FEN)).rejects.toThrow('Maia2 model error: Invalid FEN')
  })

  it('should support optional elo parameters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        best_move: 'd2d4',
        win_probability: 0.52,
        moves: { d2d4: 0.20, e2e4: 0.18, g1f3: 0.10 },
      }),
    })

    await fetchAnalysis(STARTING_FEN, { eloSelf: 1200, eloOppo: 1400 })

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:5001/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fen: STARTING_FEN, elo_self: 1200, elo_oppo: 1400 }),
    })
  })

  it('should handle equal position', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        best_move: 'e2e4',
        win_probability: 0.50,
        moves: { e2e4: 0.18, d2d4: 0.17, g1f3: 0.10 },
      }),
    })

    const result = await fetchAnalysis(STARTING_FEN)

    expect(result.winProbability).toBe(0.50)
  })

  it('should extract from/to from UCI move notation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        best_move: 'e1g1',
        win_probability: 0.55,
        moves: { e1g1: 0.25, d2d3: 0.10 },
      }),
    })

    const castlingFEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'
    const result = await fetchAnalysis(castlingFEN)

    expect(result.bestMove).toBe('e1g1')
    expect(result.from).toBe('e1')
    expect(result.to).toBe('g1')
  })
})

describe('AnalysisResult type', () => {
  it('should have all required fields', () => {
    const result: AnalysisResult = {
      bestMove: 'e2e4',
      from: 'e2',
      to: 'e4',
      winProbability: 0.55,
      moves: { e2e4: 0.18, d2d4: 0.15 },
    }

    expect(result.bestMove).toBeDefined()
    expect(result.from).toBeDefined()
    expect(result.to).toBeDefined()
    expect(result.winProbability).toBeDefined()
    expect(result.moves).toBeDefined()
  })
})
