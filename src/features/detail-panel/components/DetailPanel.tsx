'use client';

/**
 * DetailPanel Component
 *
 * Container for event details with empty and focused states.
 * Based on Spec.md Section 2.7: Detail Panel
 */

import { memo } from 'react';
import type { TimelineEvent, Track } from '@/types';
import { EventDetail } from './EventDetail';

interface DetailPanelProps {
  event: TimelineEvent | null;
  track?: Track;
  onLearnMore?: () => void;
  onUpdateEvent?: (eventId: string, updates: Partial<TimelineEvent>) => void;
  onDelete?: (eventId: string) => void;
  className?: string;
}

function DetailPanelComponent({
  event,
  track,
  onLearnMore,
  onUpdateEvent,
  onDelete,
  className = '',
}: DetailPanelProps) {
  return (
    <div className={`flex h-full flex-col border-l border-gray-200 bg-white ${className}`}>
      {event ? (
        <EventDetail
          event={event}
          track={track}
          onLearnMore={onLearnMore}
          onUpdateEvent={onUpdateEvent}
          onDelete={onDelete}
        />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

/**
 * Empty state when no event is selected
 */
function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      {/* Empty state icon */}
      <div className="mb-4 rounded-full bg-gray-100 p-4">
        <svg
          className="h-8 w-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
          />
        </svg>
      </div>

      <h3 className="text-base font-medium text-gray-900">No event selected</h3>

      <p className="mt-2 max-w-xs text-sm text-gray-500">
        Click on an event in the timeline to view its details here.
      </p>

      {/* Keyboard shortcut hint */}
      <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
        <kbd className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 font-mono">Esc</kbd>
        <span>to deselect</span>
      </div>
    </div>
  );
}

export const DetailPanel = memo(DetailPanelComponent);
