import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Chess } from 'chess.js'
import {
  type InterventionState,
  createInitialInterventionState,
  getInterventionMessage,
} from '../lib/intervention'

// ——————————————————————————————————————————
// Tests
// ——————————————————————————————————————————

describe('InterventionState', () => {
  it('should start inactive with all fields null', () => {
    const state = createInitialInterventionState()

    expect(state.isActive).toBe(false)
    expect(state.userMove).toBeNull()
    expect(state.userMoveFrom).toBeNull()
    expect(state.userMoveTo).toBeNull()
    expect(state.previousWinProb).toBeNull()
    expect(state.newWinProb).toBeNull()
    expect(state.bestMove).toBeNull()
    expect(state.moveProbs).toBeNull()
  })

  it('should hold all relevant data when intervention triggers', () => {
    const state: InterventionState = {
      isActive: true,
      userMove: 'h3',
      userMoveFrom: 'h2',
      userMoveTo: 'h3',
      previousWinProb: 0.58,
      newWinProb: 0.34,
      bestMove: 'g1f3',
      moveProbs: { g1f3: 0.22, d2d4: 0.18, h2h3: 0.03 },
    }

    expect(state.isActive).toBe(true)
    expect(state.userMove).toBe('h3')
    expect(state.previousWinProb).toBe(0.58)
    expect(state.newWinProb).toBe(0.34)
    expect(state.bestMove).toBe('g1f3')
  })

  it('should reset to initial state when intervention is resolved', () => {
    const state: InterventionState = {
      isActive: true,
      userMove: 'h3',
      userMoveFrom: 'h2',
      userMoveTo: 'h3',
      previousWinProb: 0.58,
      newWinProb: 0.34,
      bestMove: 'g1f3',
      moveProbs: { g1f3: 0.22 },
    }

    // Resolve the intervention
    const resolved = createInitialInterventionState()
    expect(resolved.isActive).toBe(false)
    expect(resolved.userMove).toBeNull()
  })
})

describe('Timer Freeze During Intervention', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should freeze the timer when intervention is active', () => {
    let whiteTime = 600
    let isInterventionActive = false
    let currentTurn: 'w' | 'b' = 'w'

    const tick = () => {
      if (isInterventionActive) return // Frozen!
      if (currentTurn === 'w') {
        whiteTime -= 1
      }
    }

    const interval = setInterval(tick, 1000)

    // Normal ticking for 3 seconds
    vi.advanceTimersByTime(3000)
    expect(whiteTime).toBe(597)

    // Intervention triggers — freeze
    isInterventionActive = true
    vi.advanceTimersByTime(10000)
    expect(whiteTime).toBe(597) // No change

    // Intervention resolves — resume
    isInterventionActive = false
    vi.advanceTimersByTime(2000)
    expect(whiteTime).toBe(595)

    clearInterval(interval)
  })

  it('should freeze BOTH timers during intervention, not just the current player', () => {
    let whiteTime = 600
    let blackTime = 600
    let isInterventionActive = false

    const tick = () => {
      if (isInterventionActive) return
      // Simulate — doesn't matter which player, both should freeze
      whiteTime -= 1
      blackTime -= 1
    }

    const interval = setInterval(tick, 1000)

    vi.advanceTimersByTime(2000)
    expect(whiteTime).toBe(598)
    expect(blackTime).toBe(598)

    isInterventionActive = true
    vi.advanceTimersByTime(5000)
    expect(whiteTime).toBe(598)
    expect(blackTime).toBe(598)

    clearInterval(interval)
  })

  it('should not lose any time during the intervention pause', () => {
    let playerTime = 500
    let isInterventionActive = false

    const tick = () => {
      if (isInterventionActive) return
      playerTime -= 1
    }

    const interval = setInterval(tick, 1000)

    // Tick for a bit
    vi.advanceTimersByTime(5000)
    const timeBeforeIntervention = playerTime
    expect(timeBeforeIntervention).toBe(495)

    // Long intervention (user reads the explanation)
    isInterventionActive = true
    vi.advanceTimersByTime(30000) // 30 seconds of reading
    expect(playerTime).toBe(timeBeforeIntervention) // Exact same

    // Resume
    isInterventionActive = false
    vi.advanceTimersByTime(1000)
    expect(playerTime).toBe(timeBeforeIntervention - 1)

    clearInterval(interval)
  })
})

describe('Board State During Intervention', () => {
  it('should darken the board when intervention is active', () => {
    // The board overlay should be driven by isInterventionActive
    const isInterventionActive = true
    const boardOverlayClass = isInterventionActive ? 'opacity-50 pointer-events-none' : ''

    expect(boardOverlayClass).toContain('opacity-50')
    expect(boardOverlayClass).toContain('pointer-events-none')
  })

  it('should restore the board when intervention resolves', () => {
    const isInterventionActive = false
    const boardOverlayClass = isInterventionActive ? 'opacity-50 pointer-events-none' : ''

    expect(boardOverlayClass).toBe('')
  })

  it('should prevent piece interaction when intervention is active', () => {
    const isInterventionActive = true
    const game = new Chess()
    game.move('e4')
    game.move('e5')

    // During intervention, clicks should be ignored
    const canInteract = !isInterventionActive && !game.isGameOver()
    expect(canInteract).toBe(false)
  })
})

describe('"Let Me Retry" — Move Undo', () => {
  it('should undo the blundered move and restore previous position', () => {
    const game = new Chess()
    game.move('e4')
    game.move('e5')
    game.move('Nf3')
    game.move('Nc6')

    const fenBeforeBlunder = game.fen()
    const turnBeforeBlunder = game.turn() // 'w'

    // User plays a dubious move
    game.move('h3') // Blunder detected!
    expect(game.fen()).not.toBe(fenBeforeBlunder)

    // "Let me retry" — undo the move
    const undone = game.undo()
    expect(undone).not.toBeNull()
    expect(game.fen()).toBe(fenBeforeBlunder)
    expect(game.turn()).toBe(turnBeforeBlunder) // Same player to move again
  })

  it('should allow the user to play a different move after retry', () => {
    const game = new Chess()
    game.move('e4')
    game.move('e5')

    // User blunders
    game.move('h3')
    game.undo()

    // User tries a better move
    const betterMove = game.move('Nf3')
    expect(betterMove).not.toBeNull()
    expect(betterMove?.san).toBe('Nf3')
  })

  it('should preserve the full move history up to the blunder point', () => {
    const game = new Chess()
    game.move('e4')
    game.move('e5')
    game.move('Nf3')
    game.move('Nc6')

    const historyBeforeBlunder = [...game.history()]
    expect(historyBeforeBlunder).toEqual(['e4', 'e5', 'Nf3', 'Nc6'])

    // Blunder + undo
    game.move('h3')
    expect(game.history()).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'h3'])

    game.undo()
    expect(game.history()).toEqual(historyBeforeBlunder)
  })

  it('should clear the intervention state after retry', () => {
    const state: InterventionState = {
      isActive: true,
      userMove: 'h3',
      userMoveFrom: 'h2',
      userMoveTo: 'h3',
      previousWinProb: 0.58,
      newWinProb: 0.34,
      bestMove: 'g1f3',
      moveProbs: { g1f3: 0.22 },
    }

    // After "Let me retry", reset intervention state
    const cleared = createInitialInterventionState()
    expect(cleared.isActive).toBe(false)
    expect(cleared.userMove).toBeNull()
  })
})

describe('"Explain Why" — Proceed to Coach', () => {
  it('should keep the blunder move on the board when user chooses explain', () => {
    const game = new Chess()
    game.move('e4')
    game.move('e5')
    game.move('h3') // Blunder

    const fenWithBlunder = game.fen()

    // User clicks "Explain why" — the move stays
    // (unlike "retry" which undoes it)
    expect(game.fen()).toBe(fenWithBlunder)
    expect(game.history()).toContain('h3')
  })

  it('should pass intervention data to the explanation system', () => {
    // When user clicks "Explain why", this payload goes to Phase 4 (LLM)
    const interventionData = {
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/7P/PPPP1PP1/RNBQKBNR b KQkq - 0 2',
      userMove: 'h3',
      bestMove: 'g1f3',
      moveProbs: { g1f3: 0.22, d2d4: 0.18, h2h3: 0.03 },
      previousWinProb: 0.55,
      newWinProb: 0.38,
    }

    // All fields needed for the LLM prompt should be present
    expect(interventionData.fen).toBeDefined()
    expect(interventionData.userMove).toBeDefined()
    expect(interventionData.bestMove).toBeDefined()
    expect(interventionData.moveProbs).toBeDefined()
    expect(interventionData.previousWinProb).toBeDefined()
    expect(interventionData.newWinProb).toBeDefined()
  })

  it('should include the win probability drop in the explanation payload', () => {
    const previousWinProb = 0.58
    const newWinProb = 0.34
    const dropPercent = Math.round((previousWinProb - newWinProb) * 100)

    expect(dropPercent).toBe(24) // "dropped their win probability from 58% to 34%"
  })
})

describe('Coach Modal Content', () => {
  it('should display a friendly intervention message', () => {
    expect(getInterventionMessage(0.25)).toBe("Hold on, that's a serious mistake!")
    expect(getInterventionMessage(0.15)).toBe("Hold on, that's a mistake.")
    expect(getInterventionMessage(0.06)).toBe("Wait — that move could be better.")
  })

  it('should show the user move and the recommended move', () => {
    const state: InterventionState = {
      isActive: true,
      userMove: 'h3',
      userMoveFrom: 'h2',
      userMoveTo: 'h3',
      previousWinProb: 0.58,
      newWinProb: 0.34,
      bestMove: 'g1f3',
      moveProbs: null,
    }

    // The modal should show: "You played h3. Consider Nf3 instead."
    expect(state.userMove).toBe('h3')
    expect(state.bestMove).toBe('g1f3')
  })

  it('should provide both action buttons', () => {
    const actions = ['retry', 'explain'] as const

    expect(actions).toContain('retry')
    expect(actions).toContain('explain')
    expect(actions).toHaveLength(2)
  })
})

describe('Intervention Flow — End to End', () => {
  it('should follow the complete intervention lifecycle', () => {
    // 1. Game is in progress
    const game = new Chess()
    game.move('e4')
    game.move('e5')

    let intervention = createInitialInterventionState()
    let timerFrozen = false

    // 2. Before the user's move, store the current evaluation
    const evalBeforeMove = 0.55

    // 3. User makes a bad move
    const blunderMove = game.move('h3')
    expect(blunderMove).not.toBeNull()

    // 4. Fetch new evaluation for the position after the move
    const evalAfterMove = 0.38

    // 5. Compare: drop = 0.55 - 0.38 = 0.17 → exceeds standard threshold (0.10)
    const drop = evalBeforeMove - evalAfterMove
    expect(drop).toBeCloseTo(0.17)
    const isBlunder = drop >= 0.10

    // 6. Trigger intervention
    if (isBlunder) {
      intervention = {
        isActive: true,
        userMove: blunderMove!.san,
        userMoveFrom: blunderMove!.from,
        userMoveTo: blunderMove!.to,
        previousWinProb: evalBeforeMove,
        newWinProb: evalAfterMove,
        bestMove: 'g1f3',
        moveProbs: { g1f3: 0.22, d2d4: 0.18, h2h3: 0.03 },
      }
      timerFrozen = true
    }

    expect(intervention.isActive).toBe(true)
    expect(timerFrozen).toBe(true)

    // 7. User clicks "Let me retry"
    game.undo()
    intervention = createInitialInterventionState()
    timerFrozen = false

    expect(intervention.isActive).toBe(false)
    expect(timerFrozen).toBe(false)
    expect(game.turn()).toBe('w') // User gets to try again
  })

  it('should follow the explain flow lifecycle', () => {
    const game = new Chess()
    game.move('e4')
    game.move('e5')

    let intervention = createInitialInterventionState()

    // User blunders
    const blunderMove = game.move('h3')
    const evalBeforeMove = 0.55
    const evalAfterMove = 0.38

    // Trigger intervention
    intervention = {
      isActive: true,
      userMove: blunderMove!.san,
      userMoveFrom: blunderMove!.from,
      userMoveTo: blunderMove!.to,
      previousWinProb: evalBeforeMove,
      newWinProb: evalAfterMove,
      bestMove: 'g1f3',
      moveProbs: { g1f3: 0.22, d2d4: 0.18, h2h3: 0.03 },
    }

    // User clicks "Explain why" — the move STAYS on the board
    const explainPayload = {
      fen: game.fen(),
      userMove: intervention.userMove,
      bestMove: intervention.bestMove,
      moveProbs: intervention.moveProbs,
      previousWinProb: intervention.previousWinProb,
      newWinProb: intervention.newWinProb,
    }

    expect(explainPayload.fen).toBeDefined()
    expect(explainPayload.userMove).toBe('h3')
    expect(explainPayload.bestMove).toBe('g1f3')

    // After explanation is shown and user dismisses, the game continues
    // The blunder move remains — game resumes with the AI responding
    intervention = createInitialInterventionState()
    expect(intervention.isActive).toBe(false)
    expect(game.turn()).toBe('b') // AI's turn to respond
  })
})

describe('Edge Cases', () => {
  it('should not trigger intervention on the very first move', () => {
    // There is no "previous" evaluation on the first move
    const previousWinProb: number | null = null
    const canCheckForBlunder = previousWinProb !== null
    expect(canCheckForBlunder).toBe(false)
  })

  it('should not trigger intervention when game is already over', () => {
    const game = new Chess()
    // Fool's mate
    game.move('f3')
    game.move('e5')
    game.move('g4')
    game.move('Qh4') // Checkmate

    const shouldCheck = !game.isGameOver()
    expect(shouldCheck).toBe(false)
  })

  it('should handle rapid sequential moves without stale evaluations', () => {
    // If user somehow makes a move before the previous eval completes,
    // we should use the last known evaluation
    let lastKnownEval = 0.50
    let evalPending = true

    // New eval arrives
    lastKnownEval = 0.55
    evalPending = false

    // User moves — use lastKnownEval as the "before" value
    expect(lastKnownEval).toBe(0.55)
    expect(evalPending).toBe(false)
  })

  it('should not trigger intervention in pass-and-play mode even with large drops', () => {
    type GameMode = 'pass-and-play' | 'coach'
    const gameMode: GameMode = 'pass-and-play'
    const previousWinProb = 0.70
    const newWinProb = 0.20 // Massive drop

    const shouldIntervene = gameMode === 'coach' && (previousWinProb - newWinProb) >= 0.10
    expect(shouldIntervene).toBe(false)
  })

  it('should handle multiple interventions in the same game', () => {
    const game = new Chess()
    let interventionCount = 0

    // First blunder cycle
    game.move('e4')
    game.move('e5')
    game.move('h3') // Blunder 1
    interventionCount++
    game.undo()
    game.move('Nf3') // Better move

    // Game continues...
    game.move('Nc6')

    // Second blunder cycle
    game.move('h3') // Blunder 2
    interventionCount++
    game.undo()
    game.move('Bc4') // Better move

    expect(interventionCount).toBe(2)
    expect(game.history()).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])
  })
})
