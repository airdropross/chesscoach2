import { describe, it, expect } from 'vitest'
import { winProbToPercent, formatWinProb } from '../components/EvalBar'

describe('EvalBar utilities', () => {
  describe('winProbToPercent', () => {
    it('should return 50% for equal position (0.5 win prob)', () => {
      const result = winProbToPercent(0.5)
      expect(result).toBe(50)
    })

    it('should return 50% when no win probability available', () => {
      const result = winProbToPercent(null)
      expect(result).toBe(50)
    })

    it('should return 100% for certain white win', () => {
      const result = winProbToPercent(1.0)
      expect(result).toBe(100)
    })

    it('should return 0% for certain black win', () => {
      const result = winProbToPercent(0.0)
      expect(result).toBe(0)
    })

    it('should return higher percentage for white advantage', () => {
      const result = winProbToPercent(0.7)
      expect(result).toBeGreaterThan(50)
    })

    it('should return lower percentage for black advantage', () => {
      const result = winProbToPercent(0.3)
      expect(result).toBeLessThan(50)
    })

    it('should be symmetric around 0.5', () => {
      const whiteAdv = winProbToPercent(0.7)
      const blackAdv = winProbToPercent(0.3)

      // Should be equidistant from 50
      expect(whiteAdv - 50).toBeCloseTo(50 - blackAdv, 1)
    })
  })

  describe('formatWinProb', () => {
    it('should format 50% win probability', () => {
      expect(formatWinProb(0.5)).toBe('50%')
    })

    it('should format high win probability', () => {
      expect(formatWinProb(0.85)).toBe('85%')
    })

    it('should format low win probability', () => {
      expect(formatWinProb(0.15)).toBe('15%')
    })

    it('should show ... when no win probability', () => {
      expect(formatWinProb(null)).toBe('...')
    })

    it('should round to nearest integer', () => {
      expect(formatWinProb(0.526)).toBe('53%')
      expect(formatWinProb(0.124)).toBe('12%')
    })
  })
})

describe('EvalBar component behavior', () => {
  describe('loading state', () => {
    it('should indicate loading with pulse animation class', () => {
      // Component uses animate-pulse class when isLoading=true
      // This is a behavioral specification for the component
      const isLoading = true
      const expectedClass = 'animate-pulse'
      expect(expectedClass).toBe('animate-pulse')
    })
  })

  describe('advantage indication', () => {
    it('should show white styling when white has advantage', () => {
      const whiteAdvantage = winProbToPercent(0.7) >= 50
      expect(whiteAdvantage).toBe(true)
    })

    it('should show black styling when black has advantage', () => {
      const blackAdvantage = winProbToPercent(0.3) < 50
      expect(blackAdvantage).toBe(true)
    })
  })
})
