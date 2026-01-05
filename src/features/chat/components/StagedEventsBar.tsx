'use client';

/**
 * StagedEventsBar Component
 *
 * Displays count of staged events with accept/reject all actions.
 * Based on Spec.md Section 2.5: Staged Events
 */

import { memo } from 'react';
import type { TimelineEvent } from '@/types';

interface StagedEventsBarProps {
  stagedEvents: TimelineEvent[];
  onAddToMainTrack: () => void;
  onAddToNewTrack: () => void;
  onRejectAll: () => void;
  isLoading?: boolean;
  className?: string;
}

function StagedEventsBarComponent({
  stagedEvents,
  onAddToMainTrack,
  onAddToNewTrack,
  onRejectAll,
  isLoading = false,
  className = '',
}: StagedEventsBarProps) {
  if (stagedEvents.length === 0) {
    return null;
  }

  return (
    <div
      className={`flex items-center justify-between border-b border-green-200 bg-green-50 px-4 py-2 ${className}`}
    >
      {/* Count and description */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs font-medium text-white">
          {stagedEvents.length}
        </div>
        <span className="text-sm text-green-800">
          {stagedEvents.length === 1 ? '1 staged event' : `${stagedEvents.length} staged events`}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onRejectAll}
          disabled={isLoading}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
        >
          Reject All
        </button>
        <button
          onClick={onAddToNewTrack}
          disabled={isLoading}
          className="rounded-md border border-green-500 bg-white px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
        >
          Add to New Track
        </button>
        <button
          onClick={onAddToMainTrack}
          disabled={isLoading}
          className="rounded-md bg-green-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-50"
        >
          Add to Main Track
        </button>
      </div>
    </div>
  );
}

export const StagedEventsBar = memo(StagedEventsBarComponent);
