'use client';

/**
 * EventTooltip Component
 *
 * Displays event details on hover.
 * Based on Spec.md Section 2.7: Event Tooltip
 */

import { memo } from 'react';
import type { TimelineEvent } from '@/types';
import { formatDateForDisplay } from '@/lib/dates';

interface EventTooltipProps {
  event: TimelineEvent | null;
  position: { x: number; y: number } | null;
}

function EventTooltipComponent({ event, position }: EventTooltipProps) {
  if (!event || !position) {
    return null;
  }

  // Format date range for display
  const dateDisplay =
    event.type === 'span' && event.endDate
      ? `${formatDateForDisplay(event.startDate, event.datePrecision)} – ${formatDateForDisplay(event.endDate, event.datePrecision)}`
      : formatDateForDisplay(event.startDate, event.datePrecision);

  return (
    <div
      className="pointer-events-none fixed z-50 max-w-xs rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%) translateY(-8px)',
      }}
    >
      <h4 className="font-semibold text-gray-900">{event.title}</h4>
      <p className="mt-1 text-sm text-gray-600">{event.description}</p>
      <p className="mt-2 text-xs text-gray-400">{dateDisplay}</p>
    </div>
  );
}

export const EventTooltip = memo(EventTooltipComponent);
