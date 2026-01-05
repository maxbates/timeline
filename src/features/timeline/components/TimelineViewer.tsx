'use client';

/**
 * TimelineViewer Component
 *
 * The main timeline visualization component.
 * Integrates canvas, controls, and state management.
 * Based on Spec.md Section 2.2: Component Hierarchy
 */

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import type { Timeline, TimelineEvent } from '@/types';
import { TimelineCanvas } from './TimelineCanvas';
import { EventTooltip } from './EventTooltip';
import { CreateEventDialog } from './CreateEventDialog';
import { calculateTimelineBounds } from '../utils/bounds';
import { useTimelineViewport } from '../hooks/useTimelineViewport';
import { useEventFocus } from '../hooks/useEventFocus';

interface TimelineViewerProps {
  timeline: Timeline;
  onEventSelect?: (event: TimelineEvent | null) => void;
  onCreateEvent?: (event: Partial<TimelineEvent>) => void;
  onCreateTrack?: () => void;
  onTrackNameChange?: (trackId: string, newName: string) => void;
  onChatAboutTrack?: (trackName: string) => void;
  className?: string;
}

export function TimelineViewer({
  timeline,
  onEventSelect,
  onCreateEvent,
  onCreateTrack,
  onTrackNameChange,
  onChatAboutTrack,
  className = '',
}: TimelineViewerProps) {
  // Ref to the scrollable timeline container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Calculate bounds from events
  const bounds = useMemo(() => calculateTimelineBounds(timeline.events), [timeline.events]);

  // Viewport state (zoom, pan)
  const {
    dateToX,
    zoomIn,
    zoomOut,
    resetZoom,
    pan,
    viewport: _viewport,
  } = useTimelineViewport({ bounds });

  // Event focus state
  const { focusedEventId, hoveredEventId, setFocusedEvent, setHoveredEvent } = useEventFocus();

  // Tooltip position state
  const [tooltipPosition, _setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Create event dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Get focused and hovered events
  const focusedEvent = useMemo(
    () => timeline.events.find((e) => e.id === focusedEventId) || null,
    [timeline.events, focusedEventId]
  );

  const hoveredEvent = useMemo(
    () => timeline.events.find((e) => e.id === hoveredEventId) || null,
    [timeline.events, hoveredEventId]
  );

  // Notify parent of event selection
  useEffect(() => {
    onEventSelect?.(focusedEvent);
  }, [focusedEvent, onEventSelect]);

  // Auto-scroll to focused event's track
  useEffect(() => {
    if (!focusedEvent || !scrollContainerRef.current) return;

    // Find the track element containing the focused event
    const trackElement = scrollContainerRef.current.querySelector(
      `[data-track-id="${focusedEvent.trackId}"]`
    );

    if (trackElement) {
      // Scroll the track into view smoothly
      trackElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [focusedEvent]);

  // Handle event click
  const handleEventClick = useCallback(
    (eventId: string) => {
      setFocusedEvent(focusedEventId === eventId ? null : eventId);
    },
    [focusedEventId, setFocusedEvent]
  );

  // Handle clear focus (clicking background)
  const handleClearFocus = useCallback(() => {
    setFocusedEvent(null);
  }, [setFocusedEvent]);

  // Handle event hover
  const handleEventHover = useCallback(
    (eventId: string | null) => {
      setHoveredEvent(eventId);
      // TODO: Calculate tooltip position from mouse event
    },
    [setHoveredEvent]
  );

  // Handle create event
  const handleCreateEvent = useCallback(
    (event: Partial<TimelineEvent>) => {
      onCreateEvent?.(event);
      setIsCreateDialogOpen(false);
    },
    [onCreateEvent]
  );

  // Handle create event in specific track
  const handleCreateEventInTrack = useCallback((_trackId: string) => {
    setIsCreateDialogOpen(true);
    // The dialog will use this trackId as default
    // We need to store it somewhere accessible to the dialog
    // For now, just open the dialog - we'll enhance this later
  }, []);

  // Handle zoom
  const handleZoom = useCallback(
    (delta: number, centerX: number) => {
      if (delta > 0) {
        zoomIn(centerX);
      } else if (delta < 0) {
        zoomOut(centerX);
      } else {
        resetZoom();
      }
    },
    [zoomIn, zoomOut, resetZoom]
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFocusedEvent(null);
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      } else if (e.key === '0') {
        resetZoom();
      } else if (e.key === 'ArrowLeft') {
        pan(-0.1);
      } else if (e.key === 'ArrowRight') {
        pan(0.1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pan, resetZoom, setFocusedEvent, zoomIn, zoomOut]);

  // Show empty state if no bounds (no events)
  if (!bounds) {
    return (
      <div
        className={`relative flex h-full flex-col items-center justify-center bg-gray-50 p-8 ${className}`}
      >
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">No events yet</h3>
        <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
          Use the chat panel to generate events, or use the track buttons to add events manually.
        </p>

        {/* Create event dialog */}
        <CreateEventDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSubmit={handleCreateEvent}
          tracks={timeline.tracks}
          defaultTrackId={timeline.tracks.find((t) => t.type === 'main')?.id}
        />
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col ${className}`}>
      {/* Timeline canvas */}
      <TimelineCanvas
        timeline={timeline}
        bounds={bounds}
        focusedEventId={focusedEventId}
        hoveredEventId={hoveredEventId}
        onEventClick={handleEventClick}
        onEventHover={handleEventHover}
        onTrackNameChange={onTrackNameChange}
        onCreateEventInTrack={handleCreateEventInTrack}
        onCreateTrack={onCreateTrack}
        onChatAboutTrack={onChatAboutTrack}
        onClearFocus={handleClearFocus}
        dateToX={dateToX}
        onPan={pan}
        onZoom={handleZoom}
        scrollContainerRef={scrollContainerRef}
      />

      {/* Event tooltip */}
      <EventTooltip event={hoveredEvent} position={tooltipPosition} />

      {/* Create event dialog */}
      <CreateEventDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateEvent}
        tracks={timeline.tracks}
        defaultTrackId={timeline.tracks.find((t) => t.type === 'main')?.id}
      />
    </div>
  );
}
