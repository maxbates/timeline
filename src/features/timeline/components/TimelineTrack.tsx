'use client';

/**
 * TimelineTrack Component
 *
 * Renders a single track with its events.
 * Based on Spec.md Section 2.6: Track Rendering
 */

import { memo, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import type { Track, TimelineEvent, EventLayout, TimelineBounds } from '@/types';
import { EventNode } from './EventNode';
import { calculateTrackHeight, getCollapsedCount } from '../utils/layout';
import { PressAndHoldButton } from '@/components/PressAndHoldButton';
import { TRACK_COLORS, type TrackColor } from '@/types';

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
  onTrackColorChange?: (trackId: string, newColor: TrackColor) => void;
  onTrackDelete?: (trackId: string) => void;
  onCreateEvent?: (trackId: string) => void;
  onChatAboutTrack?: (trackName: string) => void;
  onZoomToTrack?: (trackId: string) => void;
  onAcceptStaged?: () => void;
  onRejectStaged?: () => void;
  isAcceptingStaged?: boolean;
  dateToX: (date: string) => number;
}

const LANE_HEIGHT = 48;
const MIN_TRACK_HEIGHT = 80;
const TRACK_PADDING = 12;
const TRACK_HEADER_HEIGHT = 40;

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
  onTrackColorChange,
  onTrackDelete,
  onCreateEvent,
  onChatAboutTrack,
  onZoomToTrack,
  onAcceptStaged,
  onRejectStaged,
  isAcceptingStaged = false,
  dateToX,
}: TimelineTrackProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(track.name);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

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

  // Handle color change
  const handleColorChange = useCallback(
    (newColor: TrackColor) => {
      onTrackColorChange?.(track.id, newColor);
      setShowColorPicker(false);
    },
    [track.id, onTrackColorChange]
  );

  // Handle track delete
  const handleTrackDelete = useCallback(() => {
    onTrackDelete?.(track.id);
  }, [track.id, onTrackDelete]);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPicker]);

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

  // Count events outside the visible viewport (left and right)
  const outOfViewCounts = useMemo(() => {
    let leftCount = 0;
    let rightCount = 0;

    for (const layout of layouts) {
      const x = dateToX(eventMap.get(layout.eventId)?.startDate || '');
      if (x < 0) {
        leftCount++;
      } else if (x > 1) {
        rightCount++;
      }
    }

    return { left: leftCount, right: rightCount };
  }, [layouts, eventMap, dateToX]);

  // Get track color values
  const getTrackColorValues = useCallback(() => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      blue: { bg: '#3b82f6', text: '#ffffff' },
      red: { bg: '#ef4444', text: '#ffffff' },
      green: { bg: '#22c55e', text: '#ffffff' },
      purple: { bg: '#a855f7', text: '#ffffff' },
      orange: { bg: '#f97316', text: '#ffffff' },
      pink: { bg: '#ec4899', text: '#ffffff' },
      teal: { bg: '#14b8a6', text: '#ffffff' },
      gray: { bg: '#6b7280', text: '#ffffff' },
    };
    return colorMap[track.color] || colorMap.gray;
  }, [track.color]);

  return (
    <div
      data-track-id={track.id}
      className="relative flex flex-col border-b border-gray-200"
      style={{
        height: trackHeight + TRACK_PADDING * 2 + TRACK_HEADER_HEIGHT,
      }}
    >
      {/* Track header - horizontal layout */}
      <div
        className="flex items-center justify-between gap-3 bg-gray-50/80 px-3"
        style={{ height: TRACK_HEADER_HEIGHT }}
      >
        {/* Left side: Color swatch + Title */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {/* Color swatch button - not shown for staging track */}
          {onTrackColorChange && track.type !== 'staging' && (
            <div className="relative flex-shrink-0" ref={colorPickerRef}>
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="group flex h-5 w-5 items-center justify-center rounded transition-all hover:scale-110"
                style={{
                  backgroundColor: getTrackColorValues().bg,
                }}
                title="Change track color"
              >
                {/* Palette icon - only shown on hover */}
                <svg
                  className="h-3 w-3 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
              </button>

              {/* Color picker dropdown */}
              {showColorPicker && (
                <div className="absolute top-full left-0 z-20 mt-1 min-w-[180px] rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.keys(TRACK_COLORS) as TrackColor[])
                      .filter((color) => color !== 'green') // Green is reserved for staging track only
                      .map((color) => (
                        <button
                          key={color}
                          onClick={() => handleColorChange(color)}
                          className="h-9 w-9 flex-shrink-0 rounded transition-transform hover:scale-110"
                          style={{
                            backgroundColor: TRACK_COLORS[color],
                            border: color === track.color ? '2px solid #000' : '1px solid #e5e7eb',
                          }}
                          title={color}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Color swatch indicator for staging track - not clickable */}
          {track.type === 'staging' && (
            <div
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded"
              style={{
                backgroundColor: getTrackColorValues().bg,
              }}
            />
          )}

          {/* Track name */}
          {track.type === 'staging' ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: getTrackColorValues().bg }}>
                {track.name}
              </span>
              <span className="text-xs text-gray-500">
                {events.length} {events.length === 1 ? 'event' : 'events'}
              </span>
            </div>
          ) : isEditingName ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleSaveTrackName}
              onKeyDown={handleKeyDown}
              autoFocus
              className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm font-semibold shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              style={{
                color: getTrackColorValues().bg,
              }}
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="min-w-0 flex-1 truncate text-left text-sm font-semibold transition-colors hover:text-gray-700"
              style={{
                color: getTrackColorValues().bg,
              }}
            >
              {track.name}
            </button>
          )}
        </div>

        {/* Right side: Action buttons */}
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {/* Staging track controls */}
          {track.type === 'staging' ? (
            <>
              {/* Reject button */}
              <button
                onClick={onRejectStaged}
                disabled={isAcceptingStaged}
                className="flex items-center gap-1.5 rounded bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                title="Reject these events"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Reject
              </button>
              {/* Accept button */}
              <button
                onClick={onAcceptStaged}
                disabled={isAcceptingStaged}
                className="flex items-center gap-1.5 rounded bg-green-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                title="Accept and create new track"
              >
                {isAcceptingStaged && (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                )}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Accept
              </button>
            </>
          ) : (
            <>
              {/* Tell me more button */}
              <button
                onClick={() => onChatAboutTrack?.(track.name)}
                className="flex h-7 w-7 items-center justify-center rounded text-white shadow-sm transition-colors hover:opacity-90"
                style={{
                  backgroundColor: getTrackColorValues().bg,
                }}
                title="Generate more events for this track"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </button>

              {/* Add event button */}
              <button
                onClick={() => onCreateEvent?.(track.id)}
                className="flex h-7 w-7 items-center justify-center rounded bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                title="Add event to this track"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>

              {/* Zoom to track button */}
              {onZoomToTrack && (
                <button
                  onClick={() => onZoomToTrack(track.id)}
                  className="flex h-7 w-7 items-center justify-center rounded bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                  title="Zoom to this track's events"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                  </svg>
                </button>
              )}

              {/* Delete track button - not shown for main track */}
              {onTrackDelete && track.type !== 'main' && (
                <PressAndHoldButton
                  onComplete={handleTrackDelete}
                  duration={1500}
                  className="flex h-7 w-7 items-center justify-center rounded bg-white text-gray-600 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600"
                  title="Press and hold to delete track"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </PressAndHoldButton>
              )}
            </>
          )}
        </div>
      </div>

      {/* Timeline canvas - events area */}
      <div className="timeline-background relative flex-1">
        <svg
          width={width}
          height={trackHeight}
          className="timeline-background absolute"
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
                  containerWidth={width}
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

        {/* Out-of-view indicators */}
        {outOfViewCounts.left > 0 && (
          <div
            className="absolute top-1/2 left-2 flex -translate-y-1/2 items-center justify-center rounded-full text-xs font-semibold shadow-md"
            style={{
              backgroundColor: getTrackColorValues().bg,
              color: getTrackColorValues().text,
              width: '28px',
              height: '28px',
              zIndex: 5,
            }}
            title={`${outOfViewCounts.left} events before visible range`}
          >
            {outOfViewCounts.left}
          </div>
        )}

        {outOfViewCounts.right > 0 && (
          <div
            className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center justify-center rounded-full text-xs font-semibold shadow-md"
            style={{
              backgroundColor: getTrackColorValues().bg,
              color: getTrackColorValues().text,
              width: '28px',
              height: '28px',
              zIndex: 5,
            }}
            title={`${outOfViewCounts.right} events after visible range`}
          >
            {outOfViewCounts.right}
          </div>
        )}
      </div>
    </div>
  );
}

export const TimelineTrack = memo(TimelineTrackComponent);
