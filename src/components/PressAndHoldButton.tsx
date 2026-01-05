'use client';

/**
 * PressAndHoldButton Component
 *
 * A button that requires pressing and holding for a specified duration before triggering.
 * Shows a visual progress indicator during the hold.
 */

import { useCallback, useRef, useState, type ReactNode } from 'react';

interface PressAndHoldButtonProps {
  onComplete: () => void;
  duration?: number; // in milliseconds
  children: ReactNode;
  className?: string;
  title?: string;
  disabled?: boolean;
}

export function PressAndHoldButton({
  onComplete,
  duration = 1500,
  children,
  className = '',
  title = '',
  disabled = false,
}: PressAndHoldButtonProps) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  const progressTimer = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }, []);

  const handleStart = useCallback(() => {
    if (disabled) return;

    setIsHolding(true);
    startTime.current = Date.now();

    // Update progress indicator
    progressTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      // Trigger completion when progress reaches 100%
      if (newProgress >= 100) {
        setIsHolding(false);
        setProgress(0);
        clearTimers();
        onComplete();
      }
    }, 16); // ~60fps
  }, [disabled, duration, onComplete, clearTimers]);

  const handleEnd = useCallback(() => {
    setIsHolding(false);
    setProgress(0);
    clearTimers();
  }, [clearTimers]);

  return (
    <button
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      className={`relative overflow-hidden ${className}`}
      title={title}
      disabled={disabled}
    >
      {/* Progress indicator */}
      {isHolding && (
        <div
          className="absolute inset-0 bg-current opacity-20 transition-all"
          style={{
            width: `${progress}%`,
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </button>
  );
}
