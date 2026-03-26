'use client';

import { memo } from 'react';

export type ChatMode = 'quick' | 'research';

interface ModeToggleProps {
  mode: ChatMode;
  onToggle: () => void;
  disabled?: boolean;
}

function ModeToggleComponent({ mode, onToggle, disabled = false }: ModeToggleProps) {
  const isResearch = mode === 'research';

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-label={`Switch to ${isResearch ? 'quick' : 'research'} mode`}
      aria-pressed={isResearch}
      title={
        isResearch
          ? 'Research mode: searches Wikipedia for real sources'
          : 'Quick mode: generates from AI knowledge only'
      }
      className={`flex-shrink-0 rounded-lg p-1.5 transition-colors ${
        disabled
          ? 'cursor-not-allowed opacity-50'
          : isResearch
            ? 'bg-blue-50 text-blue-500 hover:bg-blue-100'
            : 'bg-amber-50 text-amber-500 hover:bg-amber-100'
      }`}
    >
      {isResearch ? (
        // Book icon (research)
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ) : (
        // Lightning icon (quick)
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      )}
    </button>
  );
}

export const ModeToggle = memo(ModeToggleComponent);
