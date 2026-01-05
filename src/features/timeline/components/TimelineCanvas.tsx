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

interface TimelineCanvasProps {
  timeline: Timeline;
  bounds: TimelineBounds;
  focusedEventId: string | null;
  hoveredEventId: string | null;
  onEventClick: (eventId: string) => void;
  onEventHover: (eventId: string | null) => void;
  onTrackNameChange?: (trackId: string, newName: string) => void;
  onCreateEventInTrack?: (trackId: string) => void;
  onCreateTrack?: () => void;
  onChatAboutTrack?: (trackName: string) => void;
  onClearFocus?: () => void;
  dateToX: (date: string) => number;
  onPan: (deltaX: number) => void;
  onZoom: (delta: number, centerX: number) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

function TimelineCanvasComponent({
  timeline,
  bounds,
  focusedEventId,
  hoveredEventId,
  onEventClick,
  onEventHover,
  onTrackNameChange,
  onCreateEventInTrack,
  onCreateTrack,
  onChatAboutTrack,
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

  // Calculate layouts for all tracks
  const trackLayouts = useMemo(
    () => calculateTrackLayouts(timeline.events, bounds),
    [timeline.events, bounds]
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
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline.events]);

  // Sort tracks by order
  const sortedTracks = useMemo(
    () => [...timeline.tracks].sort((a, b) => a.order - b.order),
    [timeline.tracks]
  );

  // Handle mouse drag for panning
  const isDragging = useRef(false);
  const lastMouseX = useRef(0);
  const rafId = useRef<number | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // If clicking on the canvas background (not a track element), clear focus
      if (e.target === e.currentTarget) {
        onClearFocus?.();
      }
      isDragging.current = true;
      lastMouseX.current = e.clientX;
    },
    [onClearFocus]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return;

      const deltaX = e.clientX - lastMouseX.current;
      lastMouseX.current = e.clientX;

      // Use requestAnimationFrame to throttle updates
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }

      rafId.current = requestAnimationFrame(() => {
        // Convert pixel delta to percentage
        const deltaPct = -deltaX / containerWidth;
        onPan(deltaPct);
        rafId.current = null;
      });
    },
    [containerWidth, onPan]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div className="flex flex-col">
      {/* Time axis - fixed at top */}
      <TimeAxis
        bounds={bounds}
        width={containerWidth}
        dateToX={dateToX}
        onZoomIn={() => onZoom(1, 0.5)}
        onZoomOut={() => onZoom(-1, 0.5)}
        onResetZoom={() => onZoom(0, 0.5)}
      />

      {/* Canvas area with tracks */}
      <div
        ref={containerRef}
        className="relative flex-1 cursor-grab overflow-y-auto bg-white select-none active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {sortedTracks.map((track) => {
          if (!track.visible) return null;

          const trackEvents = eventsByTrack.get(track.id) || [];
          const layouts = trackLayouts.get(track.id) || [];

          // Hide staging track if it has no staged events
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
              onCreateEvent={onCreateEventInTrack}
              onChatAboutTrack={onChatAboutTrack}
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
