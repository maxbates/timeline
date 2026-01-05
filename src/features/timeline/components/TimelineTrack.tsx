'use client';

/**
 * TimelineTrack Component
 *
 * Renders a single track with its events.
 * Based on Spec.md Section 2.6: Track Rendering
 */

import { memo, useMemo, useState, useCallback } from 'react';
import type { Track, TimelineEvent, EventLayout, TimelineBounds } from '@/types';
import { EventNode } from './EventNode';
import { calculateTrackHeight, getCollapsedCount } from '../utils/layout';

interface TimelineTrackProps {
  track: Track;
  events: TimelineEvent[];
  layouts: EventLayout[];
  bounds: TimelineBounds;
  width: number;
  focusedEventId: string | null;
  hoveredEventId: string | null;
  onEventClick: (eventId: string) => void;
  onEventHover: (eventId: string | null) => void;
  onTrackNameChange?: (trackId: string, newName: string) => void;
  onCreateEvent?: (trackId: string) => void;
  onChatAboutTrack?: (trackName: string) => void;
  dateToX: (date: string) => number;
}

const LANE_HEIGHT = 48;
const MIN_TRACK_HEIGHT = 80;
const TRACK_PADDING = 12;
const TRACK_LABEL_WIDTH = 200;

function TimelineTrackComponent({
  track,
  events,
  layouts,
  bounds: _bounds,
  width,
  focusedEventId,
  hoveredEventId,
  onEventClick,
  onEventHover,
  onTrackNameChange,
  onCreateEvent,
  onChatAboutTrack,
  dateToX,
}: TimelineTrackProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(track.name);

  // Handle track name save
  const handleSaveTrackName = useCallback(() => {
    if (editedName.trim() && editedName !== track.name) {
      onTrackNameChange?.(track.id, editedName.trim());
    }
    setIsEditingName(false);
  }, [editedName, track.id, track.name, onTrackNameChange]);

  // Handle key press in input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveTrackName();
      } else if (e.key === 'Escape') {
        setEditedName(track.name);
        setIsEditingName(false);
      }
    },
    [handleSaveTrackName, track.name]
  );

  // Calculate track height based on lane usage
  const trackHeight = useMemo(
    () => calculateTrackHeight(layouts, LANE_HEIGHT, MIN_TRACK_HEIGHT),
    [layouts]
  );

  // Get event map for quick lookup
  const eventMap = useMemo(() => {
    const map = new Map<string, TimelineEvent>();
    for (const event of events) {
      map.set(event.id, event);
    }
    return map;
  }, [events]);

  // Count collapsed events
  const collapsedCount = useMemo(() => getCollapsedCount(layouts), [layouts]);

  return (
    <div
      data-track-id={track.id}
      className="relative flex border-b border-gray-200"
      style={{
        height: trackHeight + TRACK_PADDING * 2,
      }}
    >
      {/* Track label column - fixed width */}
      <div
        className="flex flex-shrink-0 flex-col justify-center gap-1 border-r border-gray-200 bg-gray-50 px-3 py-2"
        style={{ width: TRACK_LABEL_WIDTH }}
      >
        {/* Track name */}
        <div>
          {isEditingName ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleSaveTrackName}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm font-bold shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              style={{
                color:
                  track.color === 'blue'
                    ? '#3b82f6'
                    : track.color === 'red'
                      ? '#ef4444'
                      : track.color === 'green'
                        ? '#22c55e'
                        : track.color === 'purple'
                          ? '#a855f7'
                          : track.color === 'orange'
                            ? '#f97316'
                            : track.color === 'pink'
                              ? '#ec4899'
                              : track.color === 'teal'
                                ? '#14b8a6'
                                : '#6b7280',
              }}
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="w-full truncate rounded bg-white px-2 py-1 text-left text-sm font-bold shadow-sm transition-colors hover:bg-gray-50"
              style={{
                color:
                  track.color === 'blue'
                    ? '#3b82f6'
                    : track.color === 'red'
                      ? '#ef4444'
                      : track.color === 'green'
                        ? '#22c55e'
                        : track.color === 'purple'
                          ? '#a855f7'
                          : track.color === 'orange'
                            ? '#f97316'
                            : track.color === 'pink'
                              ? '#ec4899'
                              : track.color === 'teal'
                                ? '#14b8a6'
                                : '#6b7280',
              }}
            >
              {track.name}
            </button>
          )}
        </div>

        {/* Track actions */}
        <div className="flex gap-1">
          {/* New event button - square */}
          <button
            onClick={() => onCreateEvent?.(track.id)}
            className="flex h-8 w-8 items-center justify-center rounded text-white shadow-sm transition-colors hover:opacity-90"
            style={{
              backgroundColor:
                track.color === 'blue'
                  ? '#3b82f6'
                  : track.color === 'red'
                    ? '#ef4444'
                    : track.color === 'green'
                      ? '#22c55e'
                      : track.color === 'purple'
                        ? '#a855f7'
                        : track.color === 'orange'
                          ? '#f97316'
                          : track.color === 'pink'
                            ? '#ec4899'
                            : track.color === 'teal'
                              ? '#14b8a6'
                              : '#6b7280',
            }}
            title="Add event to this track"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>

          {/* Chat about track button */}
          <button
            onClick={() => onChatAboutTrack?.(track.name)}
            className="flex h-8 w-8 items-center justify-center rounded bg-white shadow-sm transition-colors hover:bg-gray-50"
            title={`Tell me more about ${track.name}`}
          >
            <svg
              className="h-4 w-4 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Timeline canvas - events area */}
      <div className="relative flex-1">
        <svg
          width={width - TRACK_LABEL_WIDTH}
          height={trackHeight}
          className="absolute"
          style={{ top: TRACK_PADDING }}
        >
          {/* Render non-collapsed events */}
          {layouts
            .filter((layout) => !layout.collapsed)
            .map((layout) => {
              const event = eventMap.get(layout.eventId);
              if (!event) return null;

              return (
                <EventNode
                  key={event.id}
                  event={event}
                  layout={layout}
                  color={track.color}
                  isHovered={hoveredEventId === event.id}
                  isFocused={focusedEventId === event.id}
                  isStaged={event.status === 'staged'}
                  onClick={() => onEventClick(event.id)}
                  onMouseEnter={() => onEventHover(event.id)}
                  onMouseLeave={() => onEventHover(null)}
                  containerWidth={width - TRACK_LABEL_WIDTH}
                  laneHeight={LANE_HEIGHT}
                  dateToX={dateToX}
                />
              );
            })}
        </svg>

        {/* Collapsed events indicator */}
        {collapsedCount > 0 && (
          <div className="absolute right-2 bottom-2 rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
            +{collapsedCount} more
          </div>
        )}
      </div>
    </div>
  );
}

export const TimelineTrack = memo(TimelineTrackComponent);
