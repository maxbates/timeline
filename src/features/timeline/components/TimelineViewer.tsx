'use client';

/**
 * TimelineViewer Component
 *
 * The main timeline visualization component.
 * Integrates canvas, controls, and state management.
 * Based on Spec.md Section 2.2: Component Hierarchy
 */

import {
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import type { Timeline, TimelineEvent } from '@/types';
import { TimelineCanvas } from './TimelineCanvas';
import { EventTooltip } from './EventTooltip';
import { CreateEventDialog } from './CreateEventDialog';
import { calculateTimelineBounds } from '../utils/bounds';
import { useTimelineViewport } from '../hooks/useTimelineViewport';
import { useEventFocus } from '../hooks/useEventFocus';
import { dateToNumericValue, numericValueToDate } from '@/lib/dates';

export interface TimelineViewerHandle {
  zoomToFitEvents: (eventIds: string[]) => void;
  scrollToTrack: (trackId: string) => void;
}

interface TimelineViewerProps {
  timeline: Timeline;
  onEventSelect?: (event: TimelineEvent | null) => void;
  onCreateEvent?: (event: Partial<TimelineEvent>) => void;
  onCreateTrack?: () => void;
  onTrackNameChange?: (trackId: string, newName: string) => void;
  onTrackColorChange?: (trackId: string, newColor: string) => void;
  onTrackDelete?: (trackId: string) => void;
  onChatAboutTrack?: (trackName: string) => void;
  onAcceptStaged?: () => void;
  onRejectStaged?: () => void;
  isAcceptingStaged?: boolean;
  className?: string;
}

function TimelineViewerComponent(
  {
    timeline,
    onEventSelect,
    onCreateEvent,
    onCreateTrack,
    onTrackNameChange,
    onTrackColorChange,
    onTrackDelete,
    onChatAboutTrack,
    onAcceptStaged,
    onRejectStaged,
    isAcceptingStaged = false,
    className = '',
  }: TimelineViewerProps,
  ref: React.Ref<TimelineViewerHandle>
) {
  // Ref to the scrollable timeline container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Calculate bounds from events
  const bounds = useMemo(() => calculateTimelineBounds(timeline.events), [timeline.events]);

  // Viewport state (zoom, pan)
  const { dateToX, zoomIn, zoomOut, resetZoom, pan, viewport, zoomTo, panTo, visibleRange } =
    useTimelineViewport({ bounds });

  // Event focus state
  const { focusedEventId, hoveredEventId, setFocusedEvent, setHoveredEvent } = useEventFocus();

  // Tooltip position state
  const [tooltipPosition, _setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Expose zoom controls to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      zoomToFitEvents: (eventIds: string[]) => {
        if (eventIds.length === 0 || !bounds) return;

        // Get the events
        const events = timeline.events.filter((e) => eventIds.includes(e.id));
        if (events.length === 0) return;

        // Calculate date range of events
        const eventValues = events.map((e) => dateToNumericValue(e.startDate));
        const minDateValue = Math.min(...eventValues);
        const maxDateValue = Math.max(...eventValues);

        // Check if events are already visible
        const currentStart = viewport.viewStart;
        const currentEnd = viewport.viewEnd;
        const eventsVisible = minDateValue >= currentStart && maxDateValue <= currentEnd;

        if (eventsVisible) return; // Already visible, no need to zoom

        // Calculate zoom to fit all events with padding
        const range = maxDateValue - minDateValue;
        const padding = Math.max(range * 0.2, range === 0 ? 5 : 1);

        const newViewStart = minDateValue - padding;
        const newViewEnd = maxDateValue + padding;
        const newRange = newViewEnd - newViewStart;

        // Calculate required zoom level
        const fullRange = dateToNumericValue(bounds.viewEnd) - dateToNumericValue(bounds.viewStart);
        const newZoomLevel = fullRange / newRange;

        // Center point
        const center = (minDateValue + maxDateValue) / 2;
        const centerDate = numericValueToDate(center, 'day');

        // Apply zoom and pan
        zoomTo(newZoomLevel, 0.5);
        setTimeout(() => panTo(centerDate), 50);
      },
      scrollToTrack: (trackId: string) => {
        if (!scrollContainerRef.current) return;
        const trackElement = scrollContainerRef.current.querySelector(
          `[data-track-id="${trackId}"]`
        );
        if (trackElement) {
          trackElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      },
    }),
    [timeline.events, bounds, viewport, zoomTo, panTo]
  );

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

  // Auto-scroll to focused event - ensure it's visible both vertically and horizontally
  // Only runs when focusedEvent changes (not when viewport changes from panning)
  useEffect(() => {
    if (!focusedEvent || !scrollContainerRef.current || !bounds) return;

    // Capture current viewport values to avoid stale closure
    const currentViewStart = viewport.viewStart;
    const currentViewEnd = viewport.viewEnd;

    // Wait for detail panel to render and layout to settle
    const timeoutId = setTimeout(() => {
      if (!scrollContainerRef.current) return;

      // First, scroll the track header to the top of the viewer
      const trackElement = scrollContainerRef.current.querySelector(
        `[data-track-id="${focusedEvent.trackId}"]`
      );

      if (trackElement) {
        trackElement.scrollIntoView({
          behavior: 'auto',
          block: 'start', // Position track at the top
        });
      }

      // Now check if the event is visible in the viewport
      const eventElement = scrollContainerRef.current.querySelector(
        `[data-event-id="${focusedEvent.id}"]`
      );

      if (eventElement) {
        const container = scrollContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const elementRect = eventElement.getBoundingClientRect();

        // Check if event is fully visible vertically
        const isVerticallyVisible =
          elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom;

        // If event is not visible, scroll to it
        if (!isVerticallyVisible) {
          eventElement.scrollIntoView({
            behavior: 'auto',
            block: 'center',
          });
        }
      }

      // Check if the event is horizontally visible and pan if needed
      const eventDateValue = dateToNumericValue(focusedEvent.startDate);

      // Check if event is outside the current viewport
      const isVisible = eventDateValue >= currentViewStart && eventDateValue <= currentViewEnd;

      if (!isVisible) {
        // Pan to center the event in the viewport
        const centerDate = numericValueToDate(eventDateValue, 'day');
        panTo(centerDate);
      }
    }, 50);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedEvent]);

  // Handle event click
  const handleEventClick = useCallback(
    (eventId: string) => {
      // Always set the focused event, don't toggle
      // This prevents deselection if the same event is clicked during/after scroll
      setFocusedEvent(eventId);
    },
    [setFocusedEvent]
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

  // Handle zoom to track
  const handleZoomToTrack = useCallback(
    (trackId: string) => {
      // Get all events for this track
      const trackEvents = timeline.events.filter((e) => e.trackId === trackId);

      if (trackEvents.length === 0) return;
      if (!bounds) return;

      // Calculate the bounds for events in this track
      const eventValues = trackEvents.map((e) => dateToNumericValue(e.startDate));
      const minDateValue = Math.min(...eventValues);
      const maxDateValue = Math.max(...eventValues);

      // Add some padding (20% on each side, minimum 1 year)
      const range = maxDateValue - minDateValue;
      const padding = Math.max(range * 0.2, range === 0 ? 5 : 1);

      // Calculate the new viewport bounds
      const newViewStart = minDateValue - padding;
      const newViewEnd = maxDateValue + padding;
      const newRange = newViewEnd - newViewStart;

      // Calculate zoom level based on full bounds
      const fullRange = dateToNumericValue(bounds.viewEnd) - dateToNumericValue(bounds.viewStart);
      const newZoomLevel = fullRange / newRange;

      // Convert center numeric value to a date string
      const center = (minDateValue + maxDateValue) / 2;
      const centerDate = numericValueToDate(center, 'day');

      // First zoom to the calculated level
      zoomTo(newZoomLevel, 0.5);

      // Then pan to center on the track events
      // Use a small timeout to ensure zoom completes first
      setTimeout(() => {
        panTo(centerDate);
      }, 50);
    },
    [timeline.events, bounds, panTo, zoomTo]
  );

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
        viewport={viewport}
        visibleRange={visibleRange}
        focusedEventId={focusedEventId}
        hoveredEventId={hoveredEventId}
        onEventClick={handleEventClick}
        onEventHover={handleEventHover}
        onTrackNameChange={onTrackNameChange}
        onTrackColorChange={onTrackColorChange}
        onTrackDelete={onTrackDelete}
        onCreateEventInTrack={handleCreateEventInTrack}
        onCreateTrack={onCreateTrack}
        onChatAboutTrack={onChatAboutTrack}
        onZoomToTrack={handleZoomToTrack}
        onAcceptStaged={onAcceptStaged}
        onRejectStaged={onRejectStaged}
        isAcceptingStaged={isAcceptingStaged}
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

export const TimelineViewer = forwardRef(TimelineViewerComponent);
