"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Chess, Square } from "chess.js";
import { EvalBar } from "../components/EvalBar";
import { CoachModal } from "../components/CoachModal";
import { fetchAnalysis, type AnalysisResult } from "../lib/chess-api";
import {
  type InterventionState,
  createInitialInterventionState,
  isBlunder,
  calculateWinProbDrop,
  BLUNDER_THRESHOLD,
} from "../lib/intervention";

const COLUMNS = ["a", "b", "c", "d", "e", "f", "g", "h"];
const ROWS = ["8", "7", "6", "5", "4", "3", "2", "1"];
const INITIAL_TIME = 600; // 10 minutes in seconds

// Game modes
type GameMode = "pass-and-play" | "coach";

// ELO options for AI strength
const ELO_OPTIONS = [
  { elo: 400, label: "400" },
  { elo: 600, label: "600" },
  { elo: 800, label: "800" },
  { elo: 1000, label: "1000" },
  { elo: 1200, label: "1200" },
  { elo: 1400, label: "1400" },
  { elo: 1600, label: "1600" },
  { elo: 1800, label: "1800" },
  { elo: 2000, label: "2000" },
];

// Format seconds to MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// SVG Chess Pieces
const pieces: Record<string, React.ReactNode> = {
  wK: (
    <svg viewBox="0 0 45 45" className="w-14 h-14">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path strokeLinejoin="miter" d="M22.5 11.63V6M20 8h5"/>
        <path fill="#fff" strokeLinecap="butt" strokeLinejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/>
        <path fill="#fff" d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7"/>
        <path d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0"/>
      </g>
    </svg>
  ),
  wQ: (
    <svg viewBox="0 0 45 45" className="w-14 h-14">
      <g fill="#fff" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z"/>
        <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1 2.5-1 2.5-1.5 1.5 0 2.5 0 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/>
        <path fill="none" d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0"/>
        <circle cx="6" cy="12" r="2"/>
        <circle cx="14" cy="9" r="2"/>
        <circle cx="22.5" cy="8" r="2"/>
        <circle cx="31" cy="9" r="2"/>
        <circle cx="39" cy="12" r="2"/>
      </g>
    </svg>
  ),
  wR: (
    <svg viewBox="0 0 45 45" className="w-14 h-14">
      <g fill="#fff" fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path strokeLinecap="butt" d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5"/>
        <path d="M34 14l-3 3H14l-3-3"/>
        <path strokeLinecap="butt" strokeLinejoin="miter" d="M31 17v12.5H14V17"/>
        <path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/>
        <path fill="none" strokeLinejoin="miter" d="M11 14h23"/>
      </g>
    </svg>
  ),
  wB: (
    <svg viewBox="0 0 45 45" className="w-14 h-14">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <g fill="#fff" strokeLinecap="butt">
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/>
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/>
        </g>
        <path strokeLinejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/>
      </g>
    </svg>
  ),
  wN: (
    <svg viewBox="0 0 45 45" className="w-14 h-14">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path fill="#fff" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/>
        <path fill="#fff" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/>
        <path fill="#000" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zM14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z"/>
      </g>
    </svg>
  ),
  wP: (
    <svg viewBox="0 0 45 45" className="w-14 h-14">
      <path fill="#fff" stroke="#000" strokeLinecap="round" strokeWidth="1.5" d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/>
    </svg>
  ),
  bK: (
    <svg viewBox="0 0 45 45" className="w-14 h-14">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path strokeLinejoin="miter" d="M22.5 11.63V6"/>
        <path fill="#000" strokeLinejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/>
        <path fill="#000" d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7"/>
        <path strokeLinejoin="miter" d="M20 8h5"/>
        <path stroke="#fff" d="M12.5 30c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0"/>
      </g>
    </svg>
  ),
  bQ: (
    <svg viewBox="0 0 45 45" className="w-14 h-14">
      <g fill="#000" fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <g stroke="none">
          <circle cx="6" cy="12" r="2.75"/>
          <circle cx="14" cy="9" r="2.75"/>
          <circle cx="22.5" cy="8" r="2.75"/>
          <circle cx="31" cy="9" r="2.75"/>
          <circle cx="39" cy="12" r="2.75"/>
        </g>
        <path strokeLinecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z"/>
        <path strokeLinecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1 2.5-1 2.5-1.5 1.5 0 2.5 0 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/>
        <path fill="none" stroke="#fff" d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0"/>
      </g>
    </svg>
  ),
  bR: (
    <svg viewBox="0 0 45 45" className="w-14 h-14">
      <g fill="#000" fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path strokeLinecap="butt" d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z"/>
        <path strokeLinecap="butt" strokeLinejoin="miter" d="M14 29.5v-13h17v13H14z"/>
        <path strokeLinecap="butt" d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z"/>
        <path fill="none" stroke="#fff" strokeLinejoin="miter" strokeWidth="1" d="M12 35.5h21M13 31.5h19M14 29.5h17M14 16.5h17M11 14h23"/>
      </g>
    </svg>
  ),
  bB: (
    <svg viewBox="0 0 45 45" className="w-14 h-14">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <g fill="#000" strokeLinecap="butt">
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/>
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/>
        </g>
        <path stroke="#fff" strokeLinejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/>
      </g>
    </svg>
  ),
  bN: (
    <svg viewBox="0 0 45 45" className="w-14 h-14">
      <g fill="none" fillRule="evenodd" stroke="#000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
        <path fill="#000" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/>
        <path fill="#000" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/>
        <path fill="#fff" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z"/>
        <path fill="#fff" stroke="#fff" d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z"/>
        <path fill="none" stroke="#fff" strokeLinejoin="miter" d="M24.55 10.4l-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34-2.37-4.49-5.79-6.64-9.19-7.16l-.51-.1z"/>
      </g>
    </svg>
  ),
  bP: (
    <svg viewBox="0 0 45 45" className="w-14 h-14">
      <path fill="#000" stroke="#000" strokeLinecap="round" strokeWidth="1.5" d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/>
    </svg>
  ),
};

const getPiece = (color: string, type: string) => {
  const key = `${color}${type.toUpperCase()}`;
  return pieces[key] || null;
};


// Piece values for material calculation
const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

// Calculate material and captured pieces
function calculateMaterial(game: Chess) {
  const board = game.board();
  const whitePieces: Record<string, number> = { q: 0, r: 0, b: 0, n: 0, p: 0, k: 0 };
  const blackPieces: Record<string, number> = { q: 0, r: 0, b: 0, n: 0, p: 0, k: 0 };
  
  // Count pieces on board
  for (const row of board) {
    for (const square of row) {
      if (square && square.type !== "k") { // Skip kings
        if (square.color === "w") {
          whitePieces[square.type]++;
        } else {
          blackPieces[square.type]++;
        }
      }
    }
  }
  
  // Starting piece counts
  const startingPieces = { q: 1, r: 2, b: 2, n: 2, p: 8 };
  
  // Calculate captured pieces (what each side has captured from opponent)
  const whiteCaptured: string[] = []; // pieces white captured (black pieces)
  const blackCaptured: string[] = []; // pieces black captured (white pieces)
  
  for (const [piece, startCount] of Object.entries(startingPieces)) {
    const whiteLost = startCount - whitePieces[piece];
    const blackLost = startCount - blackPieces[piece];
    
    for (let i = 0; i < whiteLost; i++) blackCaptured.push(`w${piece.toUpperCase()}`);
    for (let i = 0; i < blackLost; i++) whiteCaptured.push(`b${piece.toUpperCase()}`);
  }
  
  // Sort captured pieces by value (high to low)
  const sortOrder = ["Q", "R", "B", "N", "P"];
  const sortFn = (a: string, b: string) => sortOrder.indexOf(a[1]) - sortOrder.indexOf(b[1]);
  whiteCaptured.sort(sortFn);
  blackCaptured.sort(sortFn);
  
  // Calculate material values
  let whiteMaterial = 0;
  let blackMaterial = 0;
  
  for (const [piece, count] of Object.entries(whitePieces)) {
    whiteMaterial += PIECE_VALUES[piece] * count;
  }
  for (const [piece, count] of Object.entries(blackPieces)) {
    blackMaterial += PIECE_VALUES[piece] * count;
  }
  
  return {
    whiteMaterial,
    blackMaterial,
    advantage: whiteMaterial - blackMaterial,
    whiteCaptured,
    blackCaptured,
  };
}

// Clock component with material
function PlayerClock({ 
  time, 
  isActive, 
  isWhite, 
  materialAdvantage,
  isThinking 
}: { 
  time: number; 
  isActive: boolean; 
  isWhite: boolean;
  materialAdvantage: number;
  isThinking?: boolean;
}) {
  const isLow = time <= 30;
  const isCritical = time <= 10;
  // Show advantage for this player (positive means this player is ahead)
  const playerAdvantage = isWhite ? materialAdvantage : -materialAdvantage;
  
  return (
    <div className="relative flex items-center justify-center gap-3">
      {/* Clock */}
      <div className={`
        flex items-center gap-3 px-5 py-3 rounded-xl font-mono text-2xl font-bold
        transition-all duration-300
        ${isWhite 
          ? "bg-gradient-to-r from-slate-100 to-slate-200 text-slate-900" 
          : "bg-gradient-to-r from-slate-800 to-slate-900 text-slate-100"
        }
        ${isActive ? "ring-2 ring-amber-400 shadow-lg shadow-amber-400/30" : "opacity-70"}
        ${isCritical && isActive ? "!bg-red-600 !text-white animate-pulse" : ""}
        ${isLow && !isCritical && isActive ? "!text-amber-500" : ""}
      `}>
        <div className={`w-4 h-4 rounded-full ${isWhite ? "bg-white border-2 border-slate-400" : "bg-slate-900 border-2 border-slate-600"}`} />
        <span>{formatTime(time)}</span>
      </div>
      
      {/* Material advantage */}
      {playerAdvantage !== 0 && (
        <div className={`
          px-3 py-2 rounded-lg font-bold text-xl
          ${playerAdvantage > 0 
            ? "bg-emerald-600 text-white" 
            : "bg-red-600 text-white"
          }
        `}>
          {playerAdvantage > 0 ? "+" : ""}{playerAdvantage}
        </div>
      )}
      
      {/* Thinking indicator — absolutely positioned so it doesn't affect layout */}
      <span className={`absolute left-full ml-3 text-sm font-medium whitespace-nowrap transition-opacity duration-200 ${isThinking ? "text-amber-400 animate-pulse opacity-100" : "opacity-0 pointer-events-none"}`}>
        thinking...
      </span>
    </div>
  );
}

export default function Home() {
  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [whiteTime, setWhiteTime] = useState(INITIAL_TIME);
  const [blackTime, setBlackTime] = useState(INITIAL_TIME);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(true);
  const [boardOrientation, setBoardOrientation] = useState<"w" | "b">("w"); // "w" = white at bottom
  
  // Coach mode state
  const [gameMode, setGameMode] = useState<GameMode>("pass-and-play");
  const [playerColor, setPlayerColor] = useState<"w" | "b">("w");
  const [aiElo, setAiElo] = useState(1000); // Default 1000 ELO
  const [isAiThinking, setIsAiThinking] = useState(false);
  
  // Evaluation state
  const [evaluation, setEvaluation] = useState<AnalysisResult | null>(null);
  const [isEvalLoading, setIsEvalLoading] = useState(false);
  const [showBestMoveArrow, setShowBestMoveArrow] = useState(false);
  
  // Intervention state (Phase 3)
  const [intervention, setIntervention] = useState<InterventionState>(createInitialInterventionState);
  const [isBlunderCheckPending, setIsBlunderCheckPending] = useState(false);
  const preMoveEval = useRef<number | null>(null);  // win prob before the player's move
  const preMoveFen = useRef<string | null>(null);    // FEN before the player's move
  
  // Ref to track if component is mounted (for async cleanup)
  const isMounted = useRef(true);
  
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Timer effect - ticks for both players (including AI)
  // Freezes during intervention
  useEffect(() => {
    if (!gameStarted || gameOver || game.isGameOver() || intervention.isActive) return;

    const interval = setInterval(() => {
      if (game.turn() === "w") {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            setGameOver("Black wins on time!");
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            setGameOver("White wins on time!");
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStarted, gameOver, game, intervention.isActive]);

  // Fetch evaluation after each move + blunder detection
  useEffect(() => {
    if (gameOver || game.isGameOver()) return;
    
    // Cancel stale fetches when game advances before a fetch completes
    let cancelled = false;
    
    const fetchEval = async () => {
      setIsEvalLoading(true);
      try {
        const result = await fetchAnalysis(game.fen(), {
          eloSelf: aiElo + 200,
          eloOppo: aiElo + 200,
        });
        if (!cancelled && isMounted.current) {
          // In coach mode, only update the eval bar after AI moves (not after player moves).
          // When preMoveEval is set, this fetch is for blunder detection after a player move.
          const isBlunderCheckFetch = preMoveEval.current !== null && gameMode === "coach";
          if (!isBlunderCheckFetch) {
            setEvaluation(result);
          }
          
          // Blunder detection: if we have a stored pre-move eval, compare
          if (
            preMoveEval.current !== null &&
            gameMode === "coach"
          ) {
            const previousWp = preMoveEval.current;
            const newWp = result.winProbability;
            const threshold = BLUNDER_THRESHOLD;
            
            if (isBlunder(previousWp, newWp, playerColor, threshold)) {
              // Get the last move details from the game
              const lastMoveArr = game.history({ verbose: true });
              const lastMv = lastMoveArr[lastMoveArr.length - 1];
              
              // Also fetch the pre-move best move for the modal
              // We can use the evaluation from before — or re-fetch at high ELO
              // For now, fetch from the pre-move FEN at high ELO
              let bestMove: string | null = null;
              let moveProbs: Record<string, number> | null = null;
              
              if (preMoveFen.current) {
                try {
                  const preMoveAnalysis = await fetchAnalysis(preMoveFen.current, {
                    eloSelf: 2000,
                    eloOppo: 2000,
                  });
                  bestMove = preMoveAnalysis.bestMove;
                  moveProbs = preMoveAnalysis.moves;
                } catch {
                  // Fallback: no best move info
                }
              }
              
              if (!cancelled && isMounted.current) {
                setIntervention({
                  isActive: true,
                  fenBeforeMove: preMoveFen.current,
                  userMove: lastMv?.san ?? null,
                  userMoveFrom: lastMv?.from ?? null,
                  userMoveTo: lastMv?.to ?? null,
                  previousWinProb: previousWp,
                  newWinProb: newWp,
                  bestMove,
                  moveProbs,
                });
              }
            }
            
            // Clear the pending check regardless
            preMoveEval.current = null;
            preMoveFen.current = null;
            if (!cancelled && isMounted.current) setIsBlunderCheckPending(false);
          }
        }
      } catch (error) {
        if (!cancelled) console.error("Failed to fetch evaluation:", error);
        // Clear pending check on error too
        preMoveEval.current = null;
        preMoveFen.current = null;
        if (!cancelled && isMounted.current) setIsBlunderCheckPending(false);
      } finally {
        if (!cancelled && isMounted.current) {
          setIsEvalLoading(false);
        }
      }
    };
    
    fetchEval();
    return () => { cancelled = true; };
  }, [game, gameOver, aiElo, gameMode, playerColor]);

  // AI move in coach mode — blocked during intervention
  useEffect(() => {
    if (gameMode !== "coach") return;
    if (!gameStarted || gameOver || game.isGameOver()) return;
    if (game.turn() === playerColor) return; // Not AI's turn
    if (isAiThinking) return; // Already thinking
    if (intervention.isActive) return; // Blocked during intervention
    if (isBlunderCheckPending) return; // Blunder check in progress

    const makeAiMove = async () => {
      setIsAiThinking(true);
      
      try {
        const result = await fetchAnalysis(game.fen(), { eloSelf: aiElo + 200, eloOppo: aiElo + 200 });
        
        if (!isMounted.current || gameOver) return;
        
        // On the first move, force a main-line opening pawn move
        // Use FEN fullmove number (not history.length, which resets on Chess(fen))
        let sampledMove: string;
        const fullmoveNumber = parseInt(game.fen().split(" ")[5], 10);
        if (fullmoveNumber === 1 && game.turn() === "w") {
          sampledMove = Math.random() < 0.5 ? "e2e4" : "d2d4";
        } else if (fullmoveNumber === 1 && game.turn() === "b") {
          sampledMove = Math.random() < 0.5 ? "e7e5" : "d7d5";
        } else {
          // Sample a move from the probability distribution (weighted random)
          const entries = Object.entries(result.moves);
          const totalProb = entries.reduce((sum, [, p]) => sum + p, 0);
          let rand = Math.random() * totalProb;
          sampledMove = result.bestMove; // fallback
          for (const [uci, prob] of entries) {
            rand -= prob;
            if (rand <= 0) {
              sampledMove = uci;
              break;
            }
          }
        }
        const moveFrom = sampledMove.slice(0, 2);
        const moveTo = sampledMove.slice(2, 4);
        const movePromotion = sampledMove.length > 4 ? sampledMove[4] : undefined;
        
        // Determine think time based on game phase
        let minThink: number, maxThink: number;
        if (fullmoveNumber <= 10) {
          // Opening: fast, theory moves
          minThink = 2; maxThink = 8;
        } else if (fullmoveNumber <= 25) {
          // Middlegame: longer thinks
          minThink = 5; maxThink = 20;
        } else {
          // Endgame: moderate
          minThink = 3; maxThink = 12;
        }
        const totalThinkTime = minThink + Math.floor(Math.random() * (maxThink - minThink + 1));
        
        // Animate the clock ticking down at 3x speed for the think time
        // The real clock already ticked during the API call (~1-2s),
        // now fast-forward the remaining think time
        const aiColor = playerColor === "w" ? "b" : "w";
        const setAiTime = aiColor === "w" ? setWhiteTime : setBlackTime;
        const tickInterval = Math.floor(1000 / 3); // 3x speed = ~333ms per second
        
        let aiTimedOut = false;
        for (let i = 0; i < totalThinkTime; i++) {
          if (!isMounted.current || gameOver) return;
          await new Promise(resolve => setTimeout(resolve, tickInterval));
          
          let shouldBreak = false;
          setAiTime(prev => {
            if (prev <= 1) {
              aiTimedOut = true;
              shouldBreak = true;
              return 0;
            }
            return prev - 1;
          });
          
          // Need to check after state update — use a small delay
          await new Promise(resolve => setTimeout(resolve, 10));
          if (aiTimedOut || shouldBreak) break;
        }
        
        if (aiTimedOut) {
          setGameOver(`${aiColor === "w" ? "Black" : "White"} wins on time!`);
          return;
        }
        
        if (!isMounted.current || gameOver) return;
        
        // Make the move
        const newGame = new Chess(game.fen());
        const moveObj: { from: string; to: string; promotion?: string } = { from: moveFrom, to: moveTo };
        if (movePromotion) moveObj.promotion = movePromotion;
        
        console.log(`AI move: ${sampledMove} (think=${totalThinkTime}s) FEN=${game.fen()}`);
        const move = newGame.move(moveObj);
        
        if (move) {
          setGame(newGame);
          
          // Check for game over
          if (newGame.isCheckmate()) {
            setGameOver(`Checkmate! ${newGame.turn() === "w" ? "Black" : "White"} wins!`);
          } else if (newGame.isDraw()) {
            setGameOver("Draw!");
          }
        }
      } catch (error) {
        console.error("AI move failed:", error, "\nFEN:", game.fen(), "\nHistory:", game.history(), "\nTurn:", game.turn());
      } finally {
        if (isMounted.current) {
          setIsAiThinking(false);
        }
      }
    };

    makeAiMove();
  }, [game, gameMode, playerColor, gameStarted, gameOver, aiElo, isAiThinking, intervention.isActive, isBlunderCheckPending]);

  const handleSquareClick = useCallback((square: Square) => {
    if (gameOver) return;
    if (intervention.isActive) return; // Block during intervention
    
    const piece = game.get(square);

    // If clicking on a valid move square, make the move
    if (selectedSquare && validMoves.includes(square)) {
      const newGame = new Chess(game.fen());
      const move = newGame.move({
        from: selectedSquare,
        to: square,
        promotion: "q",
      });

      if (move) {
        // In coach mode, store the pre-move eval for blunder detection
        if (gameMode === "coach" && game.turn() === playerColor && evaluation) {
          preMoveEval.current = evaluation.winProbability;
          preMoveFen.current = game.fen();
          setIsBlunderCheckPending(true);
        }
        
        setGame(newGame);
        setSelectedSquare(null);
        setValidMoves([]);
        
        // Start the clock on first move
        if (!gameStarted) {
          setGameStarted(true);
        }
        
        // Check for game over
        if (newGame.isCheckmate()) {
          setGameOver(`Checkmate! ${newGame.turn() === "w" ? "Black" : "White"} wins!`);
        } else if (newGame.isDraw()) {
          setGameOver("Draw!");
        }
        return;
      }
    }

    // If clicking on own piece, select it and show valid moves
    if (piece && piece.color === game.turn()) {
      const moves = game.moves({ square, verbose: true });
      setSelectedSquare(square);
      setValidMoves(moves.map((m) => m.to as Square));
      return;
    }

    // Otherwise, clear selection
    setSelectedSquare(null);
    setValidMoves([]);
  }, [game, selectedSquare, validMoves, gameStarted, gameOver, intervention.isActive, gameMode, playerColor, evaluation]);

  // Intervention handlers
  const handleRetry = useCallback(() => {
    // Undo the blundered move by restoring the pre-move FEN from intervention state
    if (intervention.fenBeforeMove) {
      setGame(new Chess(intervention.fenBeforeMove));
    }
    setIntervention(createInitialInterventionState());
    setIsBlunderCheckPending(false);
    preMoveFen.current = null;
    preMoveEval.current = null;
  }, [intervention.fenBeforeMove]);

  const handleExplain = useCallback(() => {
    // Phase 4 will add LLM explanation here.
    // For now, dismiss the modal and let the game continue with the move intact.
    setIntervention(createInitialInterventionState());
    setIsBlunderCheckPending(false);
    preMoveFen.current = null;
    preMoveEval.current = null;
  }, []);

  const handleContinue = useCallback(() => {
    // User accepts the move and continues playing
    setIntervention(createInitialInterventionState());
    setIsBlunderCheckPending(false);
    preMoveFen.current = null;
    preMoveEval.current = null;
  }, []);

  const resetGame = () => {
    setShowSetup(true);
    setEvaluation(null);
    setIsAiThinking(false);
    setIntervention(createInitialInterventionState());
    setIsBlunderCheckPending(false);
    preMoveFen.current = null;
    preMoveEval.current = null;
  };

  const startGame = (color: "w" | "b" | "random", mode: GameMode = "pass-and-play", elo: number = 1000) => {
    const orientation = color === "random" 
      ? (Math.random() < 0.5 ? "w" : "b") 
      : color;
    
    setGame(new Chess());
    setSelectedSquare(null);
    setValidMoves([]);
    setWhiteTime(INITIAL_TIME);
    setBlackTime(INITIAL_TIME);
    setGameStarted(false);
    setGameOver(null);
    setBoardOrientation(orientation);
    setGameMode(mode);
    setPlayerColor(orientation);
    setAiElo(elo);
    setEvaluation(null);
    setIsAiThinking(false);
    setIntervention(createInitialInterventionState());
    setIsBlunderCheckPending(false);
    preMoveFen.current = null;
    preMoveEval.current = null;
    setShowSetup(false);
    
    // In coach mode, if player is black, AI needs to move first
    // This is handled by the AI move effect
    if (mode === "coach") {
      setGameStarted(true); // Start immediately in coach mode
    }
  };

  const isLight = (col: number, row: number) => (col + row) % 2 === 0;
  
  const lastMove = game.history({ verbose: true }).slice(-1)[0];
  
  // Calculate material
  const material = calculateMaterial(game);

  // Board orientation - flip arrays if playing as black
  const displayRows = boardOrientation === "w" ? ROWS : [...ROWS].reverse();
  const displayCols = boardOrientation === "w" ? COLUMNS : [...COLUMNS].reverse();

  // Status message
  const getStatusMessage = () => {
    if (gameOver) return gameOver;
    if (game.isCheck()) return `${game.turn() === "w" ? "White" : "Black"} is in check!`;
    if (!gameStarted) return "Make a move to start the clock";
    return `${game.turn() === "w" ? "White" : "Black"} to move`;
  };

  // Setup screen state
  const [setupMode, setSetupMode] = useState<GameMode>("coach");
  const [setupElo, setSetupElo] = useState(800);
  
  // Setup screen
  if (showSetup) {
    const selectedEloOption = ELO_OPTIONS.find(o => o.elo === setupElo) || ELO_OPTIONS[3];
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent mb-2">
          Checkmate Coach
        </h1>
        <p className="text-neutral-400 text-lg mb-8">10 Minute Game</p>
        
        <div className="bg-neutral-800/50 rounded-2xl p-8 max-w-md w-full">
          {/* Game Mode Selection */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white text-center mb-4">Game Mode</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSetupMode("coach")}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                  setupMode === "coach"
                    ? "bg-amber-600 text-white"
                    : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                }`}
              >
                vs Computer
              </button>
              <button
                onClick={() => setSetupMode("pass-and-play")}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                  setupMode === "pass-and-play"
                    ? "bg-amber-600 text-white"
                    : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                }`}
              >
                Pass & Play
              </button>
            </div>
          </div>
          
          {/* ELO Selection (only in coach mode) */}
          {setupMode === "coach" && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white text-center mb-4">Computer Strength</h2>
              <select
                value={setupElo}
                onChange={(e) => setSetupElo(Number(e.target.value))}
                className="w-full px-4 py-3 bg-neutral-700 text-white rounded-xl border border-neutral-600 focus:border-amber-500 focus:outline-none"
              >
                {ELO_OPTIONS.map((option) => (
                  <option key={option.elo} value={option.elo}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <h2 className="text-lg font-semibold text-white text-center mb-4">
            {setupMode === "coach" ? "Choose Your Side" : "Choose Starting Side"}
          </h2>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={() => startGame("w", setupMode, selectedEloOption.elo)}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-neutral-100 text-neutral-900 font-semibold rounded-xl transition-all duration-200 hover:scale-105"
            >
              <span className="text-2xl">♔</span>
              <span>Play as White</span>
            </button>
            
            <button
              onClick={() => startGame("b", setupMode, selectedEloOption.elo)}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl border-2 border-neutral-700 transition-all duration-200 hover:scale-105"
            >
              <span className="text-2xl">♚</span>
              <span>Play as Black</span>
            </button>
            
            <button
              onClick={() => startGame("random", setupMode, selectedEloOption.elo)}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105"
            >
              <span className="text-2xl">🎲</span>
              <span>Random</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate arrow position for best move hint
  const getSquarePosition = (square: string) => {
    const col = COLUMNS.indexOf(square[0]);
    const row = ROWS.indexOf(square[1]);
    // Adjust for board orientation
    const displayCol = boardOrientation === "w" ? col : 7 - col;
    const displayRow = boardOrientation === "w" ? row : 7 - row;
    return { x: displayCol * 64 + 32, y: displayRow * 64 + 32 };
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent mb-2">
          Checkmate Coach
        </h1>
        <p className="text-neutral-400 text-lg">{getStatusMessage()}</p>
      </div>

      {/* Top Clock - opponent's clock */}
      <div className="mb-4">
        <PlayerClock 
          time={boardOrientation === "w" ? blackTime : whiteTime} 
          isActive={gameStarted && !gameOver && game.turn() === (boardOrientation === "w" ? "b" : "w")} 
          isWhite={boardOrientation !== "w"}
          materialAdvantage={material.advantage}
          isThinking={gameMode === "coach" && isAiThinking}
        />
      </div>

      {/* Board container with eval bar */}
      <div className="flex items-center gap-4">
        {/* Evaluation Bar — winProbability is already from white's perspective */}
        <EvalBar
          winProbability={evaluation?.winProbability ?? null}
          isLoading={isEvalLoading}
        />
        
        {/* Board container */}
        <div className={`relative transition-all duration-300 ${intervention.isActive ? "opacity-50 pointer-events-none" : ""}`}>
        {/* Board shadow/glow */}
        <div className="absolute -inset-4 bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-2xl blur-xl" />
        
        {/* Board frame */}
        <div className="relative bg-gradient-to-br from-amber-900 to-amber-950 p-3 rounded-xl shadow-2xl">
          {/* Coordinates - top */}
          <div className="flex mb-1">
            <div className="w-6" />
            {displayCols.map((col) => (
              <div key={col} className="w-16 text-center text-amber-600/60 text-xs font-medium uppercase">
                {col}
              </div>
            ))}
            <div className="w-6" />
          </div>

          <div className="flex">
            {/* Coordinates - left */}
            <div className="flex flex-col justify-around w-6">
              {displayRows.map((row) => (
                <div key={row} className="h-16 flex items-center justify-center text-amber-600/60 text-xs font-medium">
                  {row}
                </div>
              ))}
            </div>

            {/* Board */}
            <div className="grid grid-cols-8 rounded-md overflow-hidden shadow-inner">
              {displayRows.map((row, rowIndex) =>
                displayCols.map((col, colIndex) => {
                  const square = `${col}${row}` as Square;
                  const piece = game.get(square);
                  const isSelected = selectedSquare === square;
                  const isValidMove = validMoves.includes(square);
                  const isCapture = isValidMove && piece;
                  const light = isLight(colIndex, rowIndex);
                  const isLastMoveSquare = lastMove && (lastMove.from === square || lastMove.to === square);
                  const isKingInCheck = game.isCheck() && piece?.type === "k" && piece?.color === game.turn();

                  return (
                    <div
                      key={square}
                      onClick={() => handleSquareClick(square)}
                      className={`
                        w-16 h-16 flex items-center justify-center cursor-pointer relative
                        transition-all duration-150
                        ${light 
                          ? "bg-[#f0d9b5]" 
                          : "bg-[#b58863]"
                        }
                        ${isKingInCheck
                          ? "!bg-red-500"
                          : ""
                        }
                        ${isSelected 
                          ? "!bg-[#829769]" 
                          : ""
                        }
                        ${isLastMoveSquare && !isSelected && !isKingInCheck
                          ? light ? "!bg-[#cdd26a]" : "!bg-[#aaa23a]"
                          : ""
                        }
                        ${isValidMove && !isCapture && !isSelected
                          ? light ? "!bg-[#e8e4a0]" : "!bg-[#b8b468]"
                          : ""
                        }
                        hover:brightness-110
                        ${gameOver ? "pointer-events-none" : ""}
                      `}
                    >
                      {/* Valid move dot */}
                      {isValidMove && !piece && (
                        <div className="absolute w-4 h-4 rounded-full bg-black/25" />
                      )}
                      
                      {/* Capture ring */}
                      {isCapture && (
                        <div className="absolute inset-1 rounded-full border-[3px] border-red-500/70" />
                      )}

                      {/* Piece */}
                      {piece && getPiece(piece.color, piece.type)}
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Best move arrow overlay */}
            {showBestMoveArrow && evaluation && !isEvalLoading && (
              <svg 
                className="absolute top-0 left-6 w-[512px] h-[512px] pointer-events-none"
                style={{ zIndex: 10 }}
              >
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
                  </marker>
                </defs>
                <line
                  x1={getSquarePosition(evaluation.from).x}
                  y1={getSquarePosition(evaluation.from).y}
                  x2={getSquarePosition(evaluation.to).x}
                  y2={getSquarePosition(evaluation.to).y}
                  stroke="#22c55e"
                  strokeWidth="8"
                  strokeLinecap="round"
                  markerEnd="url(#arrowhead)"
                  opacity="0.8"
                />
              </svg>
            )}

            {/* Coordinates - right */}
            <div className="flex flex-col justify-around w-6">
              {displayRows.map((row) => (
                <div key={row} className="h-16 flex items-center justify-center text-amber-600/60 text-xs font-medium">
                  {row}
                </div>
              ))}
            </div>
          </div>

          {/* Coordinates - bottom */}
          <div className="flex mt-1">
            <div className="w-6" />
            {displayCols.map((col) => (
              <div key={col} className="w-16 text-center text-amber-600/60 text-xs font-medium uppercase">
                {col}
              </div>
            ))}
            <div className="w-6" />
          </div>
        </div>
        </div>
      </div>

      {/* Bottom Clock - player's clock */}
      <div className="mt-4">
        <PlayerClock 
          time={boardOrientation === "w" ? whiteTime : blackTime} 
          isActive={gameStarted && !gameOver && game.turn() === boardOrientation} 
          isWhite={boardOrientation === "w"}
          materialAdvantage={material.advantage}
        />
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={resetGame}
          className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        >
          New Game
        </button>
        
        {/* Best move toggle */}
        <button
          onClick={() => setShowBestMoveArrow(!showBestMoveArrow)}
          className={`px-4 py-3 rounded-lg font-medium transition-all ${
            showBestMoveArrow
              ? "bg-green-600 text-white"
              : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
          }`}
          title="Toggle best move hint"
        >
          {showBestMoveArrow ? "🎯 Hints On" : "🎯 Hints Off"}
        </button>
      </div>

      {/* Move count */}
      <p className="mt-3 text-neutral-500 text-sm">
        Move {Math.floor(game.history().length / 2) + 1} • {gameMode === "coach" ? `vs Computer (${ELO_OPTIONS.find(o => o.elo === aiElo)?.label || "Custom"})` : "Pass & Play"} • 10 min
      </p>

      {/* Coach Modal (Phase 3) */}
      <CoachModal
        intervention={intervention}
        playerColor={playerColor}
        onRetry={handleRetry}
        onExplain={handleExplain}
        onContinue={handleContinue}
      />
    </div>
  );
}
