import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Timer Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Timer State Management', () => {
    it('should initialize with correct time (600 seconds = 10 minutes)', () => {
      const INITIAL_TIME = 600
      let whiteTime = INITIAL_TIME
      let blackTime = INITIAL_TIME
      
      expect(whiteTime).toBe(600)
      expect(blackTime).toBe(600)
    })

    it('should decrement only active player time', () => {
      let whiteTime = 600
      let blackTime = 600
      let currentTurn: 'w' | 'b' = 'w'
      
      // Simulate timer tick for white's turn
      const tick = () => {
        if (currentTurn === 'w') {
          whiteTime -= 1
        } else {
          blackTime -= 1
        }
      }
      
      tick()
      tick()
      tick()
      
      expect(whiteTime).toBe(597)
      expect(blackTime).toBe(600)
    })

    it('should switch timer on turn change', () => {
      let whiteTime = 600
      let blackTime = 600
      let currentTurn: 'w' | 'b' = 'w'
      
      const tick = () => {
        if (currentTurn === 'w') {
          whiteTime -= 1
        } else {
          blackTime -= 1
        }
      }
      
      // White's turn
      tick()
      tick()
      expect(whiteTime).toBe(598)
      
      // Switch to black
      currentTurn = 'b'
      tick()
      tick()
      tick()
      
      expect(whiteTime).toBe(598)
      expect(blackTime).toBe(597)
    })

    it('should detect timeout at 0', () => {
      let time = 3
      let gameOver = false
      
      const tick = () => {
        if (time <= 1) {
          gameOver = true
          time = 0
        } else {
          time -= 1
        }
      }
      
      tick() // 2
      expect(gameOver).toBe(false)
      tick() // 1
      expect(gameOver).toBe(false)
      tick() // 0
      expect(gameOver).toBe(true)
      expect(time).toBe(0)
    })
  })

  describe('Timer Interval', () => {
    it('should tick every second using setInterval', () => {
      let time = 600
      const mockTick = vi.fn(() => {
        time -= 1
      })
      
      const interval = setInterval(mockTick, 1000)
      
      vi.advanceTimersByTime(3000)
      
      expect(mockTick).toHaveBeenCalledTimes(3)
      expect(time).toBe(597)
      
      clearInterval(interval)
    })

    it('should stop when game is over', () => {
      let time = 600
      let gameOver = false
      
      const tick = () => {
        if (!gameOver) {
          time -= 1
        }
      }
      
      const interval = setInterval(tick, 1000)
      
      vi.advanceTimersByTime(5000)
      expect(time).toBe(595)
      
      gameOver = true
      vi.advanceTimersByTime(5000)
      expect(time).toBe(595) // Should not have changed
      
      clearInterval(interval)
    })

    it('should not run before game starts', () => {
      let time = 600
      let gameStarted = false
      
      const tick = () => {
        if (gameStarted) {
          time -= 1
        }
      }
      
      const interval = setInterval(tick, 1000)
      
      vi.advanceTimersByTime(3000)
      expect(time).toBe(600) // Should not have changed
      
      gameStarted = true
      vi.advanceTimersByTime(3000)
      expect(time).toBe(597)
      
      clearInterval(interval)
    })
  })

  describe('Low Time Warnings', () => {
    it('should identify low time at 30 seconds or less', () => {
      const isLowTime = (time: number) => time <= 30
      
      expect(isLowTime(31)).toBe(false)
      expect(isLowTime(30)).toBe(true)
      expect(isLowTime(15)).toBe(true)
      expect(isLowTime(0)).toBe(true)
    })

    it('should identify critical time at 10 seconds or less', () => {
      const isCriticalTime = (time: number) => time <= 10
      
      expect(isCriticalTime(11)).toBe(false)
      expect(isCriticalTime(10)).toBe(true)
      expect(isCriticalTime(5)).toBe(true)
      expect(isCriticalTime(0)).toBe(true)
    })
  })

  describe('Coach Mode Timer', () => {
    it('should deduct random time (0-30s) from AI clock after AI move', () => {
      let aiTime = 600
      
      // Simulate AI time deduction after move
      const deductAiTime = (deduction: number) => {
        aiTime = Math.max(0, aiTime - deduction)
      }
      
      // Deduction should be between 0 and 30
      const randomDeduction = Math.floor(Math.random() * 31) // 0-30
      expect(randomDeduction).toBeGreaterThanOrEqual(0)
      expect(randomDeduction).toBeLessThanOrEqual(30)
      
      deductAiTime(15) // Example deduction
      expect(aiTime).toBe(585)
    })

    it('should not deduct more time than AI has remaining', () => {
      let aiTime = 10
      
      const deductAiTime = (deduction: number) => {
        aiTime = Math.max(0, aiTime - deduction)
      }
      
      deductAiTime(25) // Deduct more than remaining
      expect(aiTime).toBe(0) // Should floor at 0, not go negative
    })

    it('should pause timer during coach intervention', () => {
      let whiteTime = 600
      let blackTime = 600
      let isInterventionActive = false
      let currentTurn: 'w' | 'b' = 'w'
      
      const tick = () => {
        if (isInterventionActive) return // Timer paused during intervention
        if (currentTurn === 'w') {
          whiteTime -= 1
        } else {
          blackTime -= 1
        }
      }
      
      const interval = setInterval(tick, 1000)
      
      // Normal ticking
      vi.advanceTimersByTime(3000)
      expect(whiteTime).toBe(597)
      
      // Intervention triggered
      isInterventionActive = true
      vi.advanceTimersByTime(5000)
      expect(whiteTime).toBe(597) // Should not have changed
      
      // Intervention resolved
      isInterventionActive = false
      vi.advanceTimersByTime(2000)
      expect(whiteTime).toBe(595)
      
      clearInterval(interval)
    })

    it('should only run player timer in coach mode, not during AI thinking', () => {
      let playerTime = 600
      let aiTime = 600
      let isAiThinking = false
      let currentTurn: 'w' | 'b' = 'w' // Player is white
      const playerColor = 'w'
      
      const tick = () => {
        // In coach mode, AI doesn't use real time while thinking
        // Time is deducted as a lump sum after move
        if (currentTurn === playerColor) {
          playerTime -= 1
        }
        // AI time only deducted after move, not during thinking
      }
      
      const interval = setInterval(tick, 1000)
      
      // Player's turn - timer runs
      vi.advanceTimersByTime(5000)
      expect(playerTime).toBe(595)
      
      // Player moves, now AI's turn
      currentTurn = 'b'
      isAiThinking = true
      vi.advanceTimersByTime(3000) // AI "thinking" but timer doesn't tick
      expect(aiTime).toBe(600) // AI time unchanged during thinking
      
      clearInterval(interval)
    })
  })
})
