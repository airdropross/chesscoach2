"use client";

interface EvalBarProps {
  /** Win probability (0-1, from white's perspective) */
  winProbability: number | null;
  /** Whether the evaluation is currently loading */
  isLoading: boolean;
}

/**
 * Converts win probability to a percentage for the bar height
 * winProbability is from white's perspective (1 = white certain win, 0 = black certain win)
 */
function winProbToPercent(winProbability: number | null): number {
  if (winProbability === null) {
    return 50;
  }
  return winProbability * 100;
}

/**
 * Formats the win probability display text
 */
function formatWinProb(winProbability: number | null): string {
  if (winProbability === null) {
    return "...";
  }
  const percent = Math.round(winProbability * 100);
  return `${percent}%`;
}

export function EvalBar({ winProbability, isLoading }: EvalBarProps) {
  const whitePercent = winProbToPercent(winProbability);
  const blackPercent = 100 - whitePercent;
  const displayText = formatWinProb(winProbability);
  
  // Determine which side has advantage for text positioning
  const whiteAdvantage = whitePercent >= 50;
  
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Eval bar container */}
      <div 
        className={`
          relative w-6 h-[512px] rounded-full overflow-hidden
          bg-neutral-800 shadow-inner
          ${isLoading ? "animate-pulse" : ""}
        `}
      >
        {/* White portion (from bottom) */}
        <div 
          className="absolute bottom-0 left-0 right-0 bg-white transition-all duration-500 ease-out"
          style={{ height: `${whitePercent}%` }}
        />
        
        {/* Black portion (from top) */}
        <div 
          className="absolute top-0 left-0 right-0 bg-neutral-900 transition-all duration-500 ease-out"
          style={{ height: `${blackPercent}%` }}
        />
        
        {/* Center line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-amber-500/50 transform -translate-y-1/2" />
      </div>
      
      {/* Win probability text */}
      <div 
        className={`
          px-2 py-1 rounded text-xs font-mono font-bold
          ${whiteAdvantage 
            ? "bg-white text-neutral-900" 
            : "bg-neutral-900 text-white border border-neutral-700"
          }
          ${isLoading ? "opacity-50" : ""}
        `}
      >
        {isLoading ? "..." : displayText}
      </div>
    </div>
  );
}

// Export utility functions for testing
export { winProbToPercent, formatWinProb };
