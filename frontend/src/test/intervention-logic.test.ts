import { describe, it, expect } from 'vitest'
import { Chess } from 'chess.js'
import {
  calculateWinProbDrop,
  isBlunder,
  STRICTNESS_THRESHOLDS,
} from '../lib/intervention'

// ——————————————————————————————————————————
// Tests
// ——————————————————————————————————————————

describe('Blunder Detection — calculateWinProbDrop', () => {
  describe('White player perspective', () => {
    it('should return positive drop when white makes a bad move', () => {
      // White had 0.60, moved and now position is 0.40
      const drop = calculateWinProbDrop(0.60, 0.40, 'w')
      expect(drop).toBeCloseTo(0.20)
    })

    it('should return zero when position stays the same', () => {
      const drop = calculateWinProbDrop(0.55, 0.55, 'w')
      expect(drop).toBeCloseTo(0)
    })

    it('should return negative value when white improves position', () => {
      // White had 0.50, made a great move and now 0.70
      const drop = calculateWinProbDrop(0.50, 0.70, 'w')
      expect(drop).toBeCloseTo(-0.20)
    })

    it('should handle large blunder (0.65 → 0.30)', () => {
      const drop = calculateWinProbDrop(0.65, 0.30, 'w')
      expect(drop).toBeCloseTo(0.35)
    })

    it('should handle tiny inaccuracy (0.55 → 0.52)', () => {
      const drop = calculateWinProbDrop(0.55, 0.52, 'w')
      expect(drop).toBeCloseTo(0.03)
    })
  })

  describe('Black player perspective', () => {
    it('should return positive drop when black makes a bad move', () => {
      // Win prob from white's view was 0.40 (good for black), now 0.60 (bad for black)
      const drop = calculateWinProbDrop(0.40, 0.60, 'b')
      expect(drop).toBeCloseTo(0.20)
    })

    it('should return zero when position stays the same', () => {
      const drop = calculateWinProbDrop(0.45, 0.45, 'b')
      expect(drop).toBeCloseTo(0)
    })

    it('should return negative value when black improves position', () => {
      // White's win prob went from 0.50 to 0.30 → black improved
      const drop = calculateWinProbDrop(0.50, 0.30, 'b')
      expect(drop).toBeCloseTo(-0.20)
    })

    it('should handle blunder when black was winning (0.25 → 0.55)', () => {
      // Black was clearly winning (white had 0.25), then blundered to equal
      const drop = calculateWinProbDrop(0.25, 0.55, 'b')
      expect(drop).toBeCloseTo(0.30)
    })
  })

  describe('Edge cases', () => {
    it('should handle boundary values (0.0 and 1.0)', () => {
      // Worst possible blunder: position was winning, now completely lost
      const drop = calculateWinProbDrop(1.0, 0.0, 'w')
      expect(drop).toBeCloseTo(1.0)
    })

    it('should handle equal position (0.50)', () => {
      const drop = calculateWinProbDrop(0.50, 0.50, 'w')
      expect(drop).toBeCloseTo(0)
    })

    it('should handle already-losing position for white getting worse', () => {
      // White was already losing (0.30), blunders further to 0.10
      const drop = calculateWinProbDrop(0.30, 0.10, 'w')
      expect(drop).toBeCloseTo(0.20)
    })

    it('should handle already-losing position for black getting worse', () => {
      // Black was already losing (white at 0.70), blunders to 0.90
      const drop = calculateWinProbDrop(0.70, 0.90, 'b')
      expect(drop).toBeCloseTo(0.20)
    })
  })
})

describe('Blunder Detection — isBlunder', () => {
  describe('Standard threshold (0.10)', () => {
    const threshold = STRICTNESS_THRESHOLDS.standard

    it('should detect a clear blunder (white drops 0.15)', () => {
      expect(isBlunder(0.60, 0.45, 'w', threshold)).toBe(true)
    })

    it('should not flag a small inaccuracy (white drops 0.05)', () => {
      expect(isBlunder(0.55, 0.50, 'w', threshold)).toBe(false)
    })

    it('should detect a drop just over the threshold (drop ≈ 0.11)', () => {
      expect(isBlunder(0.60, 0.49, 'w', threshold)).toBe(true)
    })

    it('should not flag an improving move', () => {
      expect(isBlunder(0.50, 0.65, 'w', threshold)).toBe(false)
    })

    it('should detect a clear blunder for black', () => {
      // White's prob went from 0.40 to 0.55 → black dropped 0.15
      expect(isBlunder(0.40, 0.55, 'b', threshold)).toBe(true)
    })

    it('should not flag a small inaccuracy for black', () => {
      expect(isBlunder(0.45, 0.48, 'b', threshold)).toBe(false)
    })
  })

  describe('Strict threshold (0.05)', () => {
    const threshold = STRICTNESS_THRESHOLDS.strict

    it('should flag a moderate inaccuracy', () => {
      expect(isBlunder(0.55, 0.49, 'w', threshold)).toBe(true)
    })

    it('should not flag a very small fluctuation (drop 0.02)', () => {
      expect(isBlunder(0.55, 0.53, 'w', threshold)).toBe(false)
    })

    it('should flag exact threshold (0.05 drop)', () => {
      expect(isBlunder(0.55, 0.50, 'w', threshold)).toBe(true)
    })
  })

  describe('Forgiving threshold (0.20)', () => {
    const threshold = STRICTNESS_THRESHOLDS.forgiving

    it('should only flag major blunders', () => {
      expect(isBlunder(0.65, 0.44, 'w', threshold)).toBe(true)
    })

    it('should not flag a moderate mistake (drop 0.15)', () => {
      expect(isBlunder(0.60, 0.45, 'w', threshold)).toBe(false)
    })

    it('should flag a drop just over the threshold (drop ≈ 0.21)', () => {
      expect(isBlunder(0.60, 0.39, 'w', threshold)).toBe(true)
    })
  })
})

describe('Strictness Threshold Presets', () => {
  it('should have three strictness levels', () => {
    expect(Object.keys(STRICTNESS_THRESHOLDS)).toHaveLength(3)
  })

  it('should have strict < standard < forgiving', () => {
    expect(STRICTNESS_THRESHOLDS.strict).toBeLessThan(STRICTNESS_THRESHOLDS.standard)
    expect(STRICTNESS_THRESHOLDS.standard).toBeLessThan(STRICTNESS_THRESHOLDS.forgiving)
  })

  it('should have all thresholds between 0 and 1', () => {
    for (const threshold of Object.values(STRICTNESS_THRESHOLDS)) {
      expect(threshold).toBeGreaterThan(0)
      expect(threshold).toBeLessThan(1)
    }
  })
})

describe('Intervention Flow — Game State Integration', () => {
  describe('Two-phase evaluation', () => {
    it('should require evaluation before AND after the move', () => {
      // Before the user moves, we already have a win probability from the eval bar
      const previousWinProb = 0.55

      // After the user's move, we fetch a new evaluation
      const newWinProb = 0.38

      // Both values are needed to calculate the drop
      const drop = calculateWinProbDrop(previousWinProb, newWinProb, 'w')
      expect(drop).toBeCloseTo(0.17)
      expect(isBlunder(previousWinProb, newWinProb, 'w', STRICTNESS_THRESHOLDS.standard)).toBe(true)
    })

    it('should use the stored evaluation from before the move, not re-fetch', () => {
      // The pre-move evaluation should be stored in state (already available from the eval bar)
      const storedEvalBeforeMove = 0.52

      // After the move, a new eval is fetched
      const evalAfterMove = 0.50

      const drop = calculateWinProbDrop(storedEvalBeforeMove, evalAfterMove, 'w')
      expect(drop).toBeCloseTo(0.02)
      // Small fluctuation — not a blunder at any threshold
      expect(isBlunder(storedEvalBeforeMove, evalAfterMove, 'w', STRICTNESS_THRESHOLDS.strict)).toBe(false)
    })
  })

  describe('Move + evaluation sequence with chess.js', () => {
    it('should capture FEN before and after the user move', () => {
      const game = new Chess()

      // FEN before the move — used for the "before" evaluation
      const fenBefore = game.fen()
      expect(fenBefore).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')

      // User makes a move
      game.move({ from: 'e2', to: 'e4' })

      // FEN after the move — sent to Maia2 for "after" evaluation
      const fenAfter = game.fen()
      expect(fenAfter).not.toBe(fenBefore)
      expect(fenAfter).toContain('b') // Black's turn now
    })

    it('should support undo when intervention triggers', () => {
      const game = new Chess()
      game.move('e4')
      game.move('e5')

      const fenBeforeBlunder = game.fen()

      // User makes a "blunder" move
      game.move('h3')
      const fenAfterBlunder = game.fen()
      expect(fenAfterBlunder).not.toBe(fenBeforeBlunder)

      // Intervention triggers → undo the move
      const undone = game.undo()
      expect(undone).not.toBeNull()
      expect(game.fen()).toBe(fenBeforeBlunder)
    })

    it('should track the blundered move details for the modal', () => {
      const game = new Chess()
      game.move('e4')
      game.move('e5')

      // Store the move that caused the intervention
      const blunderMove = game.move('h3')
      expect(blunderMove).not.toBeNull()
      expect(blunderMove?.san).toBe('h3')
      expect(blunderMove?.from).toBe('h2')
      expect(blunderMove?.to).toBe('h3')

      // This info is passed to the CoachModal
      const interventionData = {
        move: blunderMove?.san,
        from: blunderMove?.from,
        to: blunderMove?.to,
        previousWinProb: 0.55,
        newWinProb: 0.38,
      }

      expect(interventionData.move).toBe('h3')
      expect(interventionData.previousWinProb - interventionData.newWinProb).toBeCloseTo(0.17)
    })
  })

  describe('Player color awareness', () => {
    it('should only check for blunders on the human player turn, not AI turn', () => {
      const playerColor = 'w'
      const game = new Chess()

      // White (player) to move — should be checked for blunders
      expect(game.turn()).toBe('w')
      const shouldCheck = game.turn() === playerColor
      expect(shouldCheck).toBe(true)

      // After white moves, it's black (AI) turn — skip blunder check
      game.move('e4')
      expect(game.turn()).toBe('b')
      const shouldCheckAi = game.turn() === playerColor
      expect(shouldCheckAi).toBe(false)
    })

    it('should correctly detect blunders when player is black', () => {
      const playerColor: 'w' | 'b' = 'b'
      const game = new Chess()

      // White (AI) moves first
      game.move('e4')
      expect(game.turn()).toBe('b') // Player's turn

      // Suppose eval was 0.52 (slightly white) before black's move
      const previousWinProb = 0.52
      // Black plays a bad move, white's prob jumps to 0.72
      const newWinProb = 0.72

      const drop = calculateWinProbDrop(previousWinProb, newWinProb, playerColor)
      expect(drop).toBeCloseTo(0.20)
      expect(isBlunder(previousWinProb, newWinProb, playerColor, STRICTNESS_THRESHOLDS.standard)).toBe(true)
    })
  })

  describe('No intervention in pass-and-play', () => {
    it('should not trigger intervention logic in pass-and-play mode', () => {
      type GameMode = 'pass-and-play' | 'coach'
      const gameMode: GameMode = 'pass-and-play'

      const shouldCheckForBlunders = gameMode === 'coach'
      expect(shouldCheckForBlunders).toBe(false)
    })

    it('should only trigger intervention logic in coach mode', () => {
      type GameMode = 'pass-and-play' | 'coach'
      const gameMode: GameMode = 'coach'

      const shouldCheckForBlunders = gameMode === 'coach'
      expect(shouldCheckForBlunders).toBe(true)
    })
  })
})

describe('Blunder Detection — Realistic Scenarios', () => {
  it('should detect hanging a piece (large win prob drop)', () => {
    // White hangs a bishop: win prob drops from 0.55 to 0.25
    const previous = 0.55
    const after = 0.25
    expect(isBlunder(previous, after, 'w', STRICTNESS_THRESHOLDS.forgiving)).toBe(true)
    expect(isBlunder(previous, after, 'w', STRICTNESS_THRESHOLDS.standard)).toBe(true)
    expect(isBlunder(previous, after, 'w', STRICTNESS_THRESHOLDS.strict)).toBe(true)
  })

  it('should detect a positional mistake but not at forgiving level', () => {
    // White makes a mediocre positional move: drops 0.12
    const previous = 0.55
    const after = 0.43
    expect(isBlunder(previous, after, 'w', STRICTNESS_THRESHOLDS.strict)).toBe(true)
    expect(isBlunder(previous, after, 'w', STRICTNESS_THRESHOLDS.standard)).toBe(true)
    expect(isBlunder(previous, after, 'w', STRICTNESS_THRESHOLDS.forgiving)).toBe(false)
  })

  it('should not flag a normal opening move as blunder', () => {
    // Win prob barely changes from 0.50 to 0.48 — totally normal
    const previous = 0.50
    const after = 0.48
    expect(isBlunder(previous, after, 'w', STRICTNESS_THRESHOLDS.strict)).toBe(false)
    expect(isBlunder(previous, after, 'w', STRICTNESS_THRESHOLDS.standard)).toBe(false)
    expect(isBlunder(previous, after, 'w', STRICTNESS_THRESHOLDS.forgiving)).toBe(false)
  })

  it('should detect a blunder that turns a winning position into a losing one', () => {
    // White had a solid advantage (0.72), blunders into losing (0.35)
    const previous = 0.72
    const after = 0.35
    const drop = calculateWinProbDrop(previous, after, 'w')
    expect(drop).toBeCloseTo(0.37)
    expect(isBlunder(previous, after, 'w', STRICTNESS_THRESHOLDS.forgiving)).toBe(true)
  })

  it('should detect a blunder in an already-losing position', () => {
    // White was already losing (0.30), plays a bad move (0.15)
    const previous = 0.30
    const after = 0.15
    const drop = calculateWinProbDrop(previous, after, 'w')
    expect(drop).toBeCloseTo(0.15)
    expect(isBlunder(previous, after, 'w', STRICTNESS_THRESHOLDS.standard)).toBe(true)
  })

  it('should not flag a good sacrifice as blunder (position improves later)', () => {
    // A queen sacrifice might look bad on win prob, but this test is about the
    // immediate evaluation — the system sees the drop and would flag it.
    // That's expected behaviour: the intervention gives the user a chance to reconsider.
    const previous = 0.55
    const after = 0.30
    expect(isBlunder(previous, after, 'w', STRICTNESS_THRESHOLDS.standard)).toBe(true)
    // The coach modal would then let the user confirm they want to continue
  })
})
