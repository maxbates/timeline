/**
 * Event Layout Algorithm (GarageBand-style Stacking)
 *
 * When events overlap temporally, they stack vertically within their track.
 * Based on Spec.md Section 2.6: Event Stacking
 *
 * Stacking Rules:
 * 1. Point events render above span events at the same time
 * 2. Overlapping events stack vertically (no horizontal overlap)
 * 3. Maximum stack depth: 8 events per track
 * 4. If more than 8 events overlap, show "+N more" indicator
 */

import type { TimelineEvent, EventLayout, TimelineBounds } from '@/types';
import { dateToNumericValue } from '@/lib/dates';
import { getDatePosition, getDateRangeWidth } from './bounds';

const MAX_LANES = 12; // Increased from 8 to allow more spacing
const POINT_EVENT_WIDTH = 0.008; // Visual width for point events (temporal)
const TEXT_LABEL_WIDTH = 0.12; // Text label width as percentage of timeline (~196px at 1600px width)
const MIN_VISUAL_SPACING = 0.01; // Minimum spacing between events (1% of timeline)

interface LaneOccupancy {
  start: number;
  end: number;
}

/**
 * Check if two ranges overlap or are too close visually.
 * Includes padding to prevent visual crowding.
 */
function rangesOverlapOrTooClose(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
  minSpacing: number = MIN_VISUAL_SPACING
): boolean {
  // Add padding on both sides for minimum visual spacing
  const paddedAStart = aStart - minSpacing;
  const paddedAEnd = aEnd + minSpacing;
  const paddedBStart = bStart - minSpacing;
  const paddedBEnd = bEnd + minSpacing;

  return paddedAStart < paddedBEnd && paddedAEnd > paddedBStart;
}

/**
 * Calculate layout information for all events in a track.
 *
 * Algorithm:
 * 1. Sort events by start date
 * 2. For each event, find the first available lane (0-7)
 * 3. A lane is "available" if no event in that lane overlaps temporally
 * 4. If no lane is available (all 8 occupied), mark as collapsed
 *
 * @param events - Events to layout (should be from a single track)
 * @param bounds - Timeline bounds for position calculation
 * @returns Array of layout information for each event
 */
export function calculateEventLayout(
  events: TimelineEvent[],
  bounds: TimelineBounds
): EventLayout[] {
  if (events.length === 0) {
    return [];
  }

  // Sort events by start date, then by type (points before spans for same date)
  const sortedEvents = [...events].sort((a, b) => {
    const aStart = dateToNumericValue(a.startDate);
    const bStart = dateToNumericValue(b.startDate);
    if (aStart !== bStart) {
      return aStart - bStart;
    }
    // Points come before spans at the same start date
    if (a.type === 'point' && b.type === 'span') return -1;
    if (a.type === 'span' && b.type === 'point') return 1;
    return 0;
  });

  // Track lane occupancy: array of arrays, where each inner array contains occupied ranges
  const laneOccupancies: LaneOccupancy[][] = Array.from({ length: MAX_LANES }, () => []);

  const layouts: EventLayout[] = [];

  for (const event of sortedEvents) {
    // Calculate position and width
    const x = getDatePosition(event.startDate, bounds);
    let width: number;

    if (event.type === 'span' && event.endDate) {
      width = getDateRangeWidth(event.startDate, event.endDate, bounds);
    } else {
      // Point event - use a small fixed width for visual representation
      width = POINT_EVENT_WIDTH;
    }

    // Find the effective range for collision detection
    // Include the text label width that extends to the right
    const rangeStart = x;
    const rangeEnd = x + width + TEXT_LABEL_WIDTH;

    // Find the first available lane
    let assignedLane = -1;
    for (let lane = 0; lane < MAX_LANES; lane++) {
      const occupancies = laneOccupancies[lane];
      const hasOverlap = occupancies.some((occ) =>
        rangesOverlapOrTooClose(rangeStart, rangeEnd, occ.start, occ.end)
      );

      if (!hasOverlap) {
        assignedLane = lane;
        // Add this event's range to the lane's occupancy
        occupancies.push({ start: rangeStart, end: rangeEnd });
        break;
      }
    }

    layouts.push({
      eventId: event.id,
      x,
      width,
      lane: assignedLane >= 0 ? assignedLane : MAX_LANES, // Lane 8+ means collapsed
      collapsed: assignedLane < 0,
    });
  }

  return layouts;
}

/**
 * Group events by track and calculate layouts for each track.
 *
 * @param events - All timeline events
 * @param bounds - Timeline bounds
 * @returns Map of trackId to array of event layouts
 */
export function calculateTrackLayouts(
  events: TimelineEvent[],
  bounds: TimelineBounds
): Map<string, EventLayout[]> {
  const trackEvents = new Map<string, TimelineEvent[]>();

  // Group events by track
  for (const event of events) {
    const trackId = event.trackId;
    if (!trackEvents.has(trackId)) {
      trackEvents.set(trackId, []);
    }
    trackEvents.get(trackId)!.push(event);
  }

  // Calculate layout for each track
  const trackLayouts = new Map<string, EventLayout[]>();
  for (const [trackId, trackEventList] of trackEvents) {
    trackLayouts.set(trackId, calculateEventLayout(trackEventList, bounds));
  }

  return trackLayouts;
}

/**
 * Get the maximum lane used in a set of layouts.
 * Used for calculating track height.
 */
export function getMaxLane(layouts: EventLayout[]): number {
  if (layouts.length === 0) return 0;
  return Math.min(
    MAX_LANES - 1,
    Math.max(...layouts.filter((l) => !l.collapsed).map((l) => l.lane))
  );
}

/**
 * Count how many events are collapsed (overflow) in a layout.
 */
export function getCollapsedCount(layouts: EventLayout[]): number {
  return layouts.filter((l) => l.collapsed).length;
}

/**
 * Get the IDs of collapsed events for a given position.
 * Used for showing "+N more" tooltip.
 */
export function getCollapsedEventsAtPosition(
  layouts: EventLayout[],
  x: number,
  tolerance: number = 0.02
): string[] {
  return layouts.filter((l) => l.collapsed && Math.abs(l.x - x) < tolerance).map((l) => l.eventId);
}

/**
 * Find the layout for a specific event.
 */
export function getEventLayout(layouts: EventLayout[], eventId: string): EventLayout | undefined {
  return layouts.find((l) => l.eventId === eventId);
}

/**
 * Calculate the required height for a track based on its layouts.
 *
 * @param layouts - Event layouts for the track
 * @param baseHeight - Height per lane in pixels
 * @param minHeight - Minimum track height in pixels
 * @returns Track height in pixels
 */
export function calculateTrackHeight(
  layouts: EventLayout[],
  baseHeight: number = 30,
  minHeight: number = 60
): number {
  const maxLane = getMaxLane(layouts);
  const hasCollapsed = getCollapsedCount(layouts) > 0;

  // Calculate height: (maxLane + 1) lanes, plus extra space for collapsed indicator if needed
  const lanesHeight = (maxLane + 1) * baseHeight;
  const collapsedHeight = hasCollapsed ? baseHeight : 0;

  return Math.max(minHeight, lanesHeight + collapsedHeight);
}
