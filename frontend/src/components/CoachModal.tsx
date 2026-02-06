"use client";

import {
  type InterventionState,
  calculateWinProbDrop,
  getInterventionMessage,
} from "../lib/intervention";

interface CoachModalProps {
  intervention: InterventionState;
  playerColor: "w" | "b";
  onRetry: () => void;
  onExplain: () => void;
  onContinue: () => void;
  explanationText?: string;
  isExplaining?: boolean;
}

export function CoachModal({
  intervention,
  playerColor,
  onRetry,
  onExplain,
  onContinue,
  explanationText = "",
  isExplaining = false,
}: CoachModalProps) {
  if (!intervention.isActive) return null;

  const drop =
    intervention.previousWinProb !== null && intervention.newWinProb !== null
      ? calculateWinProbDrop(
          intervention.previousWinProb,
          intervention.newWinProb,
          playerColor
        )
      : 0;

  const message = getInterventionMessage();

  const dropPercent = Math.round(drop * 100);
  const beforePercent =
    intervention.previousWinProb !== null
      ? Math.round(
          (playerColor === "w"
            ? intervention.previousWinProb
            : 1 - intervention.previousWinProb) * 100
        )
      : null;
  const afterPercent =
    intervention.newWinProb !== null
      ? Math.round(
          (playerColor === "w"
            ? intervention.newWinProb
            : 1 - intervention.newWinProb) * 100
        )
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-xl font-bold text-white">{message}</h2>
        </div>

        {/* Move info */}
        <div className="bg-neutral-800 rounded-xl p-4 mb-5 space-y-2">
          {intervention.userMove && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">You played</span>
              <span className="font-mono font-bold text-red-400 text-base">
                {intervention.userMove}
              </span>
            </div>
          )}
          {intervention.bestMove && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">Consider instead</span>
              <span className="font-mono font-bold text-green-400 text-base">
                {intervention.bestMove}
              </span>
            </div>
          )}
          {beforePercent !== null && afterPercent !== null && (
            <div className="flex items-center justify-between text-sm pt-1 border-t border-neutral-700">
              <span className="text-neutral-400">Win chance</span>
              <span className="text-neutral-200">
                {beforePercent}%{" "}
                <span className="text-red-400">→ {afterPercent}%</span>
                <span className="text-neutral-500 ml-1">(-{dropPercent}%)</span>
              </span>
            </div>
          )}
        </div>

        {/* Explanation (Phase 4) */}
        {(isExplaining || explanationText) && (
          <div className="bg-neutral-800 rounded-xl p-4 mb-5">
            {isExplaining && !explanationText ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 bg-neutral-700 rounded w-full" />
                <div className="h-3 bg-neutral-700 rounded w-5/6" />
                <div className="h-3 bg-neutral-700 rounded w-4/6" />
              </div>
            ) : (
              <p className="text-neutral-200 text-sm leading-relaxed whitespace-pre-wrap">
                {explanationText}
                {isExplaining && (
                  <span className="inline-block w-1.5 h-4 bg-amber-400 ml-0.5 animate-pulse align-text-bottom" />
                )}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {!explanationText && !isExplaining ? (
            <>
              <div className="flex gap-3">
                <button
                  onClick={onRetry}
                  className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Let me retry
                </button>
                <button
                  onClick={onExplain}
                  className="flex-1 px-4 py-3 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Explain why
                </button>
              </div>
              <button
                onClick={onContinue}
                className="w-full px-4 py-2 text-neutral-500 hover:text-neutral-300 text-sm font-medium transition-colors duration-200"
              >
                Continue anyway
              </button>
            </>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={onRetry}
                className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Let me retry
              </button>
              <button
                onClick={onContinue}
                className="flex-1 px-4 py-3 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Continue anyway
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
