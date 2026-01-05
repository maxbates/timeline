'use client';

/**
 * Event Focus Hook
 *
 * Manages the focused and hovered event state.
 * Based on Spec.md Section 3.1: focusedEventId, hoveredEventId
 */

import { useState, useCallback } from 'react';

interface UseEventFocusReturn {
  focusedEventId: string | null;
  hoveredEventId: string | null;
  setFocusedEvent: (eventId: string | null) => void;
  setHoveredEvent: (eventId: string | null) => void;
  clearFocus: () => void;
  isFocused: (eventId: string) => boolean;
  isHovered: (eventId: string) => boolean;
}

export function useEventFocus(): UseEventFocusReturn {
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  const setFocusedEvent = useCallback((eventId: string | null) => {
    setFocusedEventId(eventId);
  }, []);

  const setHoveredEvent = useCallback((eventId: string | null) => {
    setHoveredEventId(eventId);
  }, []);

  const clearFocus = useCallback(() => {
    setFocusedEventId(null);
  }, []);

  const isFocused = useCallback((eventId: string) => focusedEventId === eventId, [focusedEventId]);

  const isHovered = useCallback((eventId: string) => hoveredEventId === eventId, [hoveredEventId]);

  return {
    focusedEventId,
    hoveredEventId,
    setFocusedEvent,
    setHoveredEvent,
    clearFocus,
    isFocused,
    isHovered,
  };
}
