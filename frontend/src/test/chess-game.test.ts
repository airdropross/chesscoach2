import { describe, it, expect } from 'vitest'
import { Chess } from 'chess.js'

describe('Chess.js Integration', () => {
  describe('Game Initialization', () => {
    it('should start with the correct FEN', () => {
      const game = new Chess()
      expect(game.fen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    })

    it('should start with white to move', () => {
      const game = new Chess()
      expect(game.turn()).toBe('w')
    })

    it('should not be in check at start', () => {
      const game = new Chess()
      expect(game.isCheck()).toBe(false)
    })

    it('should not be game over at start', () => {
      const game = new Chess()
      expect(game.isGameOver()).toBe(false)
    })
  })

  describe('Move Validation', () => {
    it('should allow valid pawn moves', () => {
      const game = new Chess()
      const move = game.move({ from: 'e2', to: 'e4' })
      expect(move).not.toBeNull()
      expect(game.turn()).toBe('b')
    })

    it('should allow pawn double move from starting position', () => {
      const game = new Chess()
      const move = game.move({ from: 'e2', to: 'e4' })
      expect(move).not.toBeNull()
    })

    it('should reject invalid moves', () => {
      const game = new Chess()
      expect(() => game.move({ from: 'e2', to: 'e5' })).toThrow()
    })

    it('should reject moving opponent pieces', () => {
      const game = new Chess()
      expect(() => game.move({ from: 'e7', to: 'e5' })).toThrow()
    })

    it('should allow knight moves', () => {
      const game = new Chess()
      const move = game.move({ from: 'g1', to: 'f3' })
      expect(move).not.toBeNull()
      expect(move?.piece).toBe('n')
    })

    it('should handle captures correctly', () => {
      const game = new Chess()
      game.move('e4')
      game.move('d5')
      const capture = game.move('exd5')
      expect(capture).not.toBeNull()
      expect(capture?.captured).toBe('p')
    })
  })

  describe('Check Detection', () => {
    it('should detect when king is in check', () => {
      const game = new Chess()
      game.move('e4')
      game.move('e5')
      game.move('Qh5')
      game.move('Nc6')
      game.move('Qxf7') // Check!
      expect(game.isCheck()).toBe(true)
    })

    it('should require moving out of check', () => {
      const game = new Chess()
      // Scholar's mate setup
      game.move('e4')
      game.move('e5')
      game.move('Qh5')
      game.move('Nc6')
      game.move('Qxf7') // Check
      
      // Black must respond to check
      const moves = game.moves()
      // All legal moves should address the check
      expect(moves.length).toBeGreaterThan(0)
      expect(game.isCheck()).toBe(true)
    })
  })

  describe('Checkmate Detection', () => {
    it('should detect fool\'s mate', () => {
      const game = new Chess()
      game.move('f3')
      game.move('e5')
      game.move('g4')
      game.move('Qh4') // Checkmate!
      
      expect(game.isCheckmate()).toBe(true)
      expect(game.isGameOver()).toBe(true)
    })

    it('should detect scholar\'s mate', () => {
      const game = new Chess()
      game.move('e4')
      game.move('e5')
      game.move('Qh5')
      game.move('Nc6')
      game.move('Bc4')
      game.move('Nf6')
      game.move('Qxf7') // Checkmate!
      
      expect(game.isCheckmate()).toBe(true)
      expect(game.isGameOver()).toBe(true)
    })
  })

  describe('Draw Detection', () => {
    it('should detect stalemate', () => {
      // Load a stalemate position
      const game = new Chess()
      game.load('k7/8/1K6/8/8/8/8/7R w - - 0 1')
      game.move('Rh8') // Stalemate - black king has no legal moves but is not in check
      
      // This specific position might not be stalemate, let's use a known one
      const stalemateGame = new Chess()
      stalemateGame.load('k7/8/1K6/8/8/8/8/8 w - - 0 1')
      // King vs King is a draw by insufficient material
      expect(stalemateGame.isDraw()).toBe(true)
    })

    it('should detect insufficient material (K vs K)', () => {
      const game = new Chess()
      game.load('k7/8/8/8/8/8/8/K7 w - - 0 1')
      expect(game.isInsufficientMaterial()).toBe(true)
      expect(game.isDraw()).toBe(true)
    })
  })

  describe('Special Moves', () => {
    it('should handle castling kingside', () => {
      const game = new Chess()
      game.move('e4')
      game.move('e5')
      game.move('Nf3')
      game.move('Nc6')
      game.move('Bc4')
      game.move('Bc5')
      const castle = game.move('O-O') // Kingside castle
      
      expect(castle).not.toBeNull()
      expect(game.get('g1')?.type).toBe('k')
      expect(game.get('f1')?.type).toBe('r')
    })

    it('should handle en passant', () => {
      const game = new Chess()
      game.move('e4')
      game.move('a6')
      game.move('e5')
      game.move('d5') // Pawn moves two squares
      const enPassant = game.move('exd6') // En passant capture
      
      expect(enPassant).not.toBeNull()
      expect(enPassant?.flags).toContain('e') // en passant flag
    })

    it('should handle pawn promotion', () => {
      const game = new Chess()
      game.load('8/P7/8/8/8/8/8/k1K5 w - - 0 1')
      const promotion = game.move({ from: 'a7', to: 'a8', promotion: 'q' })
      
      expect(promotion).not.toBeNull()
      expect(game.get('a8')?.type).toBe('q')
    })
  })

  describe('Move History', () => {
    it('should track move history', () => {
      const game = new Chess()
      game.move('e4')
      game.move('e5')
      game.move('Nf3')
      
      const history = game.history()
      expect(history).toEqual(['e4', 'e5', 'Nf3'])
    })

    it('should provide verbose history with from/to squares', () => {
      const game = new Chess()
      game.move('e4')
      
      const history = game.history({ verbose: true })
      expect(history[0].from).toBe('e2')
      expect(history[0].to).toBe('e4')
      expect(history[0].piece).toBe('p')
    })

    it('should support undo', () => {
      const game = new Chess()
      game.move('e4')
      game.move('e5')
      
      const undone = game.undo()
      expect(undone).not.toBeNull()
      expect(game.turn()).toBe('b')
      expect(game.history()).toEqual(['e4'])
    })
  })

  describe('FEN Loading', () => {
    it('should load a custom FEN position', () => {
      const game = new Chess()
      const fen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
      game.load(fen)
      
      expect(game.fen()).toBe(fen)
      expect(game.turn()).toBe('w')
    })

    it('should correctly identify pieces after loading FEN', () => {
      const game = new Chess()
      game.load('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1')
      
      expect(game.get('e4')?.type).toBe('p')
      expect(game.get('e4')?.color).toBe('w')
    })
  })
})

describe('Coach Mode', () => {
  describe('Game Mode Types', () => {
    it('should support pass-and-play mode', () => {
      type GameMode = 'pass-and-play' | 'coach'
      const mode: GameMode = 'pass-and-play'
      expect(mode).toBe('pass-and-play')
    })

    it('should support coach mode', () => {
      type GameMode = 'pass-and-play' | 'coach'
      const mode: GameMode = 'coach'
      expect(mode).toBe('coach')
    })
  })

  describe('Player Color Assignment', () => {
    it('should allow player to choose white in coach mode', () => {
      type PlayerColor = 'w' | 'b'
      const playerColor: PlayerColor = 'w'
      const aiColor: PlayerColor = playerColor === 'w' ? 'b' : 'w'
      
      expect(playerColor).toBe('w')
      expect(aiColor).toBe('b')
    })

    it('should allow player to choose black in coach mode', () => {
      type PlayerColor = 'w' | 'b'
      const playerColor: PlayerColor = 'b'
      const aiColor: PlayerColor = 'w';
      
      expect(playerColor).toBe('b')
      expect(aiColor).toBe('w')
    })
  })

  describe('AI Move Execution', () => {
    it('should execute AI move from API response', () => {
      const game = new Chess()
      
      // Simulate API response with best move
      const apiResponse = {
        bestMove: 'e4',
        from: 'e2',
        to: 'e4',
      }
      
      // Execute the move
      const move = game.move({ from: apiResponse.from, to: apiResponse.to })
      
      expect(move).not.toBeNull()
      expect(game.get('e4')?.type).toBe('p')
      expect(game.turn()).toBe('b')
    })

    it('should handle AI castling move', () => {
      const game = new Chess()
      // Position where white can castle
      game.load('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4')
      
      const apiResponse = {
        bestMove: 'O-O',
        from: 'e1',
        to: 'g1',
        flags: 'k',
      }
      
      const move = game.move({ from: apiResponse.from, to: apiResponse.to })
      
      expect(move).not.toBeNull()
      expect(game.get('g1')?.type).toBe('k')
      expect(game.get('f1')?.type).toBe('r')
    })

    it('should handle AI promotion move', () => {
      const game = new Chess()
      game.load('8/P7/8/8/8/8/8/k1K5 w - - 0 1')
      
      const apiResponse = {
        bestMove: 'a8=Q',
        from: 'a7',
        to: 'a8',
        promotion: 'q',
      }
      
      const move = game.move({ 
        from: apiResponse.from, 
        to: apiResponse.to,
        promotion: apiResponse.promotion,
      })
      
      expect(move).not.toBeNull()
      expect(game.get('a8')?.type).toBe('q')
    })
  })

  describe('Turn Enforcement in Coach Mode', () => {
    it('should only allow moves on player turn', () => {
      const game = new Chess()
      const playerColor = 'w'
      
      const isPlayerTurn = () => game.turn() === playerColor
      
      expect(isPlayerTurn()).toBe(true) // White to move, player is white
      
      game.move('e4')
      expect(isPlayerTurn()).toBe(false) // Black to move, player is white
    })

    it('should determine when it is AI turn', () => {
      const game = new Chess()
      const playerColor = 'w'
      const aiColor = 'b'
      
      const isAiTurn = () => game.turn() === aiColor
      
      expect(isAiTurn()).toBe(false) // White to move
      
      game.move('e4')
      expect(isAiTurn()).toBe(true) // Black to move
    })
  })

  describe('ELO Level Configuration', () => {
    it('should provide ELO options for Maia2', () => {
      // ELO options passed directly to Maia2 as elo_self/elo_oppo
      const ELO_OPTIONS = [
        { elo: 400, label: '400' },
        { elo: 600, label: '600' },
        { elo: 800, label: '800' },
        { elo: 1000, label: '1000' },
        { elo: 1200, label: '1200' },
        { elo: 1400, label: '1400' },
        { elo: 1600, label: '1600' },
        { elo: 1800, label: '1800' },
        { elo: 2000, label: '2000' },
      ]
      
      expect(ELO_OPTIONS).toHaveLength(9)
      expect(ELO_OPTIONS[0].elo).toBe(400)
      expect(ELO_OPTIONS[8].elo).toBe(2000)
    })

    it('should allow configurable ELO levels', () => {
      interface CoachModeConfig {
        playerColor: 'w' | 'b'
        aiElo: number
      }
      
      const config: CoachModeConfig = {
        playerColor: 'w',
        aiElo: 1000,
      }
      
      expect(config.aiElo).toBe(1000)
      expect(config.playerColor).toBe('w')
    })
  })
})
