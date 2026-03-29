'use client';

import { memo, useState } from 'react';

interface DigDeeperSectionProps {
  suggestions: string[];
  onDigDeeper: (prompt: string) => void;
  isGenerating?: boolean;
}

function DigDeeperSectionComponent({
  suggestions,
  onDigDeeper,
  isGenerating = false,
}: DigDeeperSectionProps) {
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);

  if (!suggestions || suggestions.length === 0) return null;

  const handleClick = (suggestion: string, index: number) => {
    if (isGenerating) return;
    setClickedIndex(index);
    onDigDeeper(suggestion);
  };

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-500">Dig Deeper</h4>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => {
          const isClicked = clickedIndex === index && isGenerating;
          const isDisabled = isGenerating && clickedIndex !== index;

          return (
            <button
              key={suggestion}
              onClick={() => handleClick(suggestion, index)}
              disabled={isGenerating}
              role="button"
              tabIndex={0}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                isClicked
                  ? 'border-blue-300 bg-blue-100 text-blue-700'
                  : isDisabled
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 opacity-50'
                    : 'cursor-pointer border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
              title={isGenerating ? 'Research in progress...' : suggestion}
            >
              {isClicked ? (
                <span className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Researching...
                </span>
              ) : (
                suggestion
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const DigDeeperSection = memo(DigDeeperSectionComponent);
