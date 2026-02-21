'use client';

/**
 * Timeline Viewport Hook
 *
 * Manages the visible portion of the timeline, including zoom and pan state.
 * Based on Spec.md Section 3.1: TimelineViewport
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { TimelineBounds } from '@/types';
import { dateToNumericValue, numericValueToDate } from '@/lib/dates';

interface ViewportState {
  // The current visible range (in numeric year values)
  viewStart: number;
  viewEnd: number;
  // Zoom level: 1 = default, <1 = zoomed out, >1 = zoomed in
  zoomLevel: number;
}

interface UseTimelineViewportOptions {
  bounds: TimelineBounds | null;
  minZoom?: number;
  maxZoom?: number;
}

interface UseTimelineViewportReturn {
  viewport: ViewportState;
  // Position helpers
  dateToX: (date: string) => number;
  xToDate: (x: number) => string;
  // Zoom controls
  zoomIn: (centerX?: number) => void;
  zoomOut: (centerX?: number) => void;
  zoomTo: (level: number, centerX?: number) => void;
  resetZoom: () => void;
  // Pan controls
  pan: (deltaX: number) => void;
  panTo: (date: string) => void;
  // Computed values
  visibleRange: { start: string; end: string } | null;
}

const DEFAULT_ZOOM = 1;
const ZOOM_STEP = 1.5;

export function useTimelineViewport({
  bounds,
  minZoom = 0.1,
  maxZoom = 100,
}: UseTimelineViewportOptions): UseTimelineViewportReturn {
  // Initialize viewport from bounds
  const initialState = useMemo<ViewportState>(() => {
    if (!bounds) {
      return { viewStart: 0, viewEnd: 1, zoomLevel: DEFAULT_ZOOM };
    }
    return {
      viewStart: dateToNumericValue(bounds.viewStart),
      viewEnd: dateToNumericValue(bounds.viewEnd),
      zoomLevel: DEFAULT_ZOOM,
    };
  }, [bounds]);

  const [viewport, setViewport] = useState<ViewportState>(initialState);

  // When bounds expand (e.g. new staged events arrive outside current range),
  // expand the viewport to include the new bounds
  useEffect(() => {
    if (!bounds) return;

    const newStart = dateToNumericValue(bounds.viewStart);
    const newEnd = dateToNumericValue(bounds.viewEnd);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing viewport with externally-driven bounds expansion
    setViewport((prev) => {
      const boundsExpanded = newStart < prev.viewStart || newEnd > prev.viewEnd;
      if (!boundsExpanded) return prev;

      // Expand viewport to fit all events
      return {
        viewStart: Math.min(prev.viewStart, newStart),
        viewEnd: Math.max(prev.viewEnd, newEnd),
        zoomLevel: DEFAULT_ZOOM,
      };
    });
  }, [bounds]);

  // Get the full range from bounds
  const fullRange = useMemo(() => {
    if (!bounds) return { start: 0, end: 1 };
    return {
      start: dateToNumericValue(bounds.viewStart),
      end: dateToNumericValue(bounds.viewEnd),
    };
  }, [bounds]);

  // Convert a date to an x position (0-1) within the viewport
  const dateToX = useCallback(
    (date: string): number => {
      const value = dateToNumericValue(date);
      const range = viewport.viewEnd - viewport.viewStart;
      if (range === 0) return 0.5;
      return (value - viewport.viewStart) / range;
    },
    [viewport]
  );

  // Convert an x position (0-1) to a date
  const xToDate = useCallback(
    (x: number): string => {
      const range = viewport.viewEnd - viewport.viewStart;
      const value = viewport.viewStart + x * range;
      return numericValueToDate(value, 'day');
    },
    [viewport]
  );

  // Zoom in (increase detail)
  const zoomIn = useCallback(
    (centerX: number = 0.5) => {
      setViewport((prev) => {
        const newZoom = Math.min(prev.zoomLevel * ZOOM_STEP, maxZoom);
        const range = prev.viewEnd - prev.viewStart;
        const center = prev.viewStart + centerX * range;
        const newRange = (fullRange.end - fullRange.start) / newZoom;
        const newStart = center - centerX * newRange;
        const newEnd = center + (1 - centerX) * newRange;

        return {
          viewStart: Math.max(fullRange.start - newRange, newStart),
          viewEnd: Math.min(fullRange.end + newRange, newEnd),
          zoomLevel: newZoom,
        };
      });
    },
    [fullRange, maxZoom]
  );

  // Zoom out (decrease detail)
  const zoomOut = useCallback(
    (centerX: number = 0.5) => {
      setViewport((prev) => {
        const newZoom = Math.max(prev.zoomLevel / ZOOM_STEP, minZoom);
        const range = prev.viewEnd - prev.viewStart;
        const center = prev.viewStart + centerX * range;
        const newRange = (fullRange.end - fullRange.start) / newZoom;
        const newStart = center - centerX * newRange;
        const newEnd = center + (1 - centerX) * newRange;

        return {
          viewStart: newStart,
          viewEnd: newEnd,
          zoomLevel: newZoom,
        };
      });
    },
    [fullRange, minZoom]
  );

  // Zoom to a specific level
  const zoomTo = useCallback(
    (level: number, centerX: number = 0.5) => {
      const clampedLevel = Math.max(minZoom, Math.min(maxZoom, level));
      setViewport((prev) => {
        const range = prev.viewEnd - prev.viewStart;
        const center = prev.viewStart + centerX * range;
        const newRange = (fullRange.end - fullRange.start) / clampedLevel;
        const newStart = center - centerX * newRange;
        const newEnd = center + (1 - centerX) * newRange;

        return {
          viewStart: newStart,
          viewEnd: newEnd,
          zoomLevel: clampedLevel,
        };
      });
    },
    [fullRange, minZoom, maxZoom]
  );

  // Reset zoom to default
  const resetZoom = useCallback(() => {
    setViewport({
      viewStart: fullRange.start,
      viewEnd: fullRange.end,
      zoomLevel: DEFAULT_ZOOM,
    });
  }, [fullRange]);

  // Pan by a delta (in percentage of current view)
  const pan = useCallback((deltaX: number) => {
    setViewport((prev) => {
      const range = prev.viewEnd - prev.viewStart;
      const delta = deltaX * range;
      return {
        ...prev,
        viewStart: prev.viewStart + delta,
        viewEnd: prev.viewEnd + delta,
      };
    });
  }, []);

  // Pan to center on a specific date
  const panTo = useCallback((date: string) => {
    const targetValue = dateToNumericValue(date);
    setViewport((prev) => {
      const _range = prev.viewEnd - prev.viewStart;
      const center = (prev.viewStart + prev.viewEnd) / 2;
      const delta = targetValue - center;
      return {
        ...prev,
        viewStart: prev.viewStart + delta,
        viewEnd: prev.viewEnd + delta,
      };
    });
  }, []);

  // Compute visible range as date strings
  const visibleRange = useMemo(() => {
    if (!bounds) return null;
    return {
      start: numericValueToDate(viewport.viewStart, 'day'),
      end: numericValueToDate(viewport.viewEnd, 'day'),
    };
  }, [bounds, viewport]);

  return {
    viewport,
    dateToX,
    xToDate,
    zoomIn,
    zoomOut,
    zoomTo,
    resetZoom,
    pan,
    panTo,
    visibleRange,
  };
}
