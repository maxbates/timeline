'use client';

/**
 * TimelineCanvas Component
 *
 * The main canvas area containing tracks and events.
 * Handles pan/zoom gestures and renders the timeline content.
 * Based on Spec.md Section 2.6: Timeline Panel
 */

import { memo, useMemo, useRef, useCallback, useEffect, useState } from 'react';
import type { Timeline, TimelineBounds } from '@/types';
import { TimelineTrack } from './TimelineTrack';
import { TimeAxis } from './TimeAxis';
import { calculateTrackLayouts } from '../utils/layout';

interface ViewportState {
  viewStart: number;
  viewEnd: number;
  zoomLevel: number;
}

interface TimelineCanvasProps {
  timeline: Timeline;
  bounds: TimelineBounds;
  viewport: ViewportState;
  visibleRange: { start: string; end: string } | null;
  focusedEventId: string | null;
  hoveredEventId: string | null;
  onEventClick: (eventId: string) => void;
  onEventHover: (eventId: string | null) => void;
  onTrackNameChange?: (trackId: string, newName: string) => void;
  onTrackColorChange?: (trackId: string, newColor: string) => void;
  onTrackDelete?: (trackId: string) => void;
  onCreateEventInTrack?: (trackId: string) => void;
  onCreateTrack?: () => void;
  onChatAboutTrack?: (trackName: string) => void;
  onZoomToTrack?: (trackId: string) => void;
  onAcceptStaged?: () => void;
  onRejectStaged?: () => void;
  isAcceptingStaged?: boolean;
  onClearFocus?: () => void;
  dateToX: (date: string) => number;
  onPan: (deltaX: number) => void;
  onZoom: (delta: number, centerX: number) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

function TimelineCanvasComponent({
  timeline,
  bounds,
  viewport,
  visibleRange,
  focusedEventId,
  hoveredEventId,
  onEventClick,
  onEventHover,
  onTrackNameChange,
  onTrackColorChange,
  onTrackDelete,
  onCreateEventInTrack,
  onCreateTrack,
  onChatAboutTrack,
  onZoomToTrack,
  onAcceptStaged,
  onRejectStaged,
  isAcceptingStaged = false,
  onClearFocus,
  dateToX,
  onPan,
  onZoom,
  scrollContainerRef,
}: TimelineCanvasProps) {
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = scrollContainerRef || internalContainerRef;
  const [containerWidth, setContainerWidth] = useState(800);

  // Track container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(container);
    setContainerWidth(container.clientWidth);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create viewport-based bounds for the time axis
  // This ensures ticks update based on the visible range when zooming
  const viewportBounds = useMemo(() => {
    if (!visibleRange) return bounds;

    // Calculate the range to determine appropriate snap unit
    const startValue = viewport.viewStart;
    const endValue = viewport.viewEnd;
    const range = endValue - startValue;

    // Determine snap unit based on visible range
    const getSnapUnit = (rangeDuration: number): typeof bounds.snapUnit => {
      const absDuration = Math.abs(rangeDuration);
      if (absDuration < 1 / 12) return 'day';
      if (absDuration < 1) return 'month';
      if (absDuration < 10) return 'year';
      if (absDuration < 100) return 'decade';
      if (absDuration < 1000) return 'century';
      return 'millennium';
    };

    return {
      dataStart: bounds.dataStart,
      dataEnd: bounds.dataEnd,
      viewStart: visibleRange.start,
      viewEnd: visibleRange.end,
      snapUnit: getSnapUnit(range),
    };
  }, [bounds, visibleRange, viewport.viewStart, viewport.viewEnd]);

  // Calculate layouts for all tracks
  // Re-layout when viewport zoom level changes significantly
  const trackLayouts = useMemo(
    () => calculateTrackLayouts(timeline.events, bounds, dateToX, containerWidth),
    [timeline.events, bounds, dateToX, containerWidth, viewport.zoomLevel]
  );

  // Group events by track
  const eventsByTrack = useMemo(() => {
    const map = new Map<string, typeof timeline.events>();
    for (const event of timeline.events) {
      if (!map.has(event.trackId)) {
        map.set(event.trackId, []);
      }
      map.get(event.trackId)!.push(event);
    }

    // Log staging track events for debugging
    const stagingTrack = timeline.tracks.find((t) => t.type === 'staging');
    if (stagingTrack) {
      const stagingEvents = map.get(stagingTrack.id) || [];
      console.log('Staging track events:', {
        trackId: stagingTrack.id,
        eventCount: stagingEvents.length,
        events: stagingEvents.map((e) => ({
          id: e.id,
          title: e.title,
          trackId: e.trackId,
          status: e.status,
        })),
      });
    }

    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline.events, timeline.tracks]);

  // Sort tracks by order
  const sortedTracks = useMemo(
    () => [...timeline.tracks].sort((a, b) => a.order - b.order),
    [timeline.tracks]
  );

  // DEBUG: Log all track IDs and event track IDs
  console.log('=== TIMELINE DEBUG ===', {
    allTrackIds: timeline.tracks.map((t) => ({ id: t.id, name: t.name, type: t.type })),
    allEventTrackIds: timeline.events.map((e) => ({
      id: e.id,
      title: e.title,
      trackId: e.trackId,
      status: e.status,
    })),
    stagingTrackId: timeline.tracks.find((t) => t.type === 'staging')?.id,
    eventsByTrackMap: Array.from(eventsByTrack.entries()).map(([trackId, events]) => ({
      trackId,
      eventCount: events.length,
      eventIds: events.map((e) => e.id),
    })),
  });

  // Handle mouse drag for panning (horizontal) and scrolling (vertical)
  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const lastMouseX = useRef(0);
  const lastMouseY = useRef(0);
  const mouseDownTarget = useRef<EventTarget | null>(null);
  const rafId = useRef<number | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    hasMoved.current = false;
    lastMouseX.current = e.clientX;
    lastMouseY.current = e.clientY;
    mouseDownTarget.current = e.target;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return;

      const deltaX = e.clientX - lastMouseX.current;
      const deltaY = e.clientY - lastMouseY.current;

      // Mark as moved if there's significant movement
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        hasMoved.current = true;
      }

      lastMouseX.current = e.clientX;
      lastMouseY.current = e.clientY;

      // Use requestAnimationFrame to throttle updates
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }

      rafId.current = requestAnimationFrame(() => {
        // Handle vertical scrolling
        if (containerRef.current) {
          containerRef.current.scrollTop -= deltaY;
        }

        // Handle horizontal panning (convert pixel delta to percentage)
        const deltaPct = -deltaX / containerWidth;
        onPan(deltaPct);

        rafId.current = null;
      });
    },
    [containerWidth, onPan, containerRef]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      // If it was a click (not a drag) on a non-interactive element, clear focus
      if (!hasMoved.current && mouseDownTarget.current === e.target) {
        const target = e.target as HTMLElement;

        // Check if the target is part of an event by looking for data-event-id in parents
        const isPartOfEvent = target.closest('[data-event-id]') !== null;

        // Check if the click was on the background (svg or track container, not an event or button)
        // Only clear focus if it's NOT part of an event
        if (
          !isPartOfEvent &&
          (target.tagName === 'svg' ||
            target.tagName === 'DIV' ||
            target.classList.contains('timeline-background'))
        ) {
          onClearFocus?.();
        }
      }

      isDragging.current = false;
      hasMoved.current = false;
      mouseDownTarget.current = null;
    },
    [onClearFocus]
  );

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Time axis - fixed at top */}
      <div className="sticky top-0 z-10 flex-shrink-0 bg-white">
        <TimeAxis
          bounds={viewportBounds}
          width={containerWidth}
          dateToX={dateToX}
          onZoomIn={() => onZoom(1, 0.5)}
          onZoomOut={() => onZoom(-1, 0.5)}
          onResetZoom={() => onZoom(0, 0.5)}
        />
      </div>

      {/* Canvas area with tracks */}
      <div
        ref={containerRef}
        className="relative flex-1 cursor-grab overflow-x-hidden overflow-y-auto bg-white select-none active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {sortedTracks.map((track) => {
          if (!track.visible) return null;

          const trackEvents = eventsByTrack.get(track.id) || [];
          const layouts = trackLayouts.get(track.id) || [];

          // Hide staging track if it has no events
          if (track.type === 'staging' && trackEvents.length === 0) {
            return null;
          }

          return (
            <TimelineTrack
              key={track.id}
              track={track}
              events={trackEvents}
              layouts={layouts}
              bounds={bounds}
              width={containerWidth}
              focusedEventId={focusedEventId}
              hoveredEventId={hoveredEventId}
              onEventClick={onEventClick}
              onEventHover={onEventHover}
              onTrackNameChange={onTrackNameChange}
              onTrackColorChange={onTrackColorChange}
              onTrackDelete={onTrackDelete}
              onCreateEvent={onCreateEventInTrack}
              onChatAboutTrack={onChatAboutTrack}
              onZoomToTrack={onZoomToTrack}
              onAcceptStaged={track.type === 'staging' ? onAcceptStaged : undefined}
              onRejectStaged={track.type === 'staging' ? onRejectStaged : undefined}
              isAcceptingStaged={isAcceptingStaged}
              dateToX={dateToX}
            />
          );
        })}

        {/* New Track button */}
        {onCreateTrack && (
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={onCreateTrack}
              className="flex w-48 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Track
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const TimelineCanvas = memo(TimelineCanvasComponent);
