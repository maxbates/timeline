/**
 * Timeline Data Types
 * Based on Spec.md Section 1: Data Models
 */

// Track color options (Apple-style flat colors)
export type TrackColor =
  | 'blue' // Default for main track (#007AFF)
  | 'green' // Default for staging (#34C759)
  | 'red' // #FF3B30
  | 'orange' // #FF9500
  | 'purple' // #AF52DE
  | 'pink' // #FF2D55
  | 'teal' // #5AC8FA
  | 'gray'; // #8E8E93

export const TRACK_COLORS: Record<TrackColor, string> = {
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  orange: '#FF9500',
  purple: '#AF52DE',
  pink: '#FF2D55',
  teal: '#5AC8FA',
  gray: '#8E8E93',
};

// Source type for event citations
export type SourceType = 'wikipedia' | 'article' | 'book' | 'other';

export interface EventSource {
  title: string; // Source name/title
  url: string; // Link to source
  type: SourceType;
  accessedAt?: string; // ISO 8601, when the source was accessed
}

// Location data for events with optional coordinates
export interface EventLocation {
  name: string; // Human-readable location name
  latitude?: number;
  longitude?: number;
  placeId?: string; // Google Places ID or similar
}

// Date precision levels
export type DatePrecision = 'year' | 'month' | 'day' | 'datetime';

// Event types: point (single date) or span (date range)
export type EventType = 'point' | 'span';

// Event status: staged (pending user approval) or confirmed
export type EventStatus = 'confirmed' | 'staged';

// Track types
export type TrackType = 'main' | 'staging' | 'custom';

// Timeline visibility
export type TimelineVisibility = 'private' | 'unlisted' | 'public';

/**
 * TimelineEvent represents a single event on the timeline.
 * Events can be either point events (single date) or span events (date range).
 *
 * Dates use Extended ISO 8601 format to support BCE/CE dates:
 * - CE dates: "2024-03-15" (standard ISO 8601)
 * - BCE dates: "-0753-04-21" (negative year prefix)
 * - Year-only: "2024" or "-0500"
 */
export interface TimelineEvent {
  id: string; // UUID v4
  timelineId: string; // Parent timeline ID
  trackId: string; // Which track this event belongs to

  // Content
  title: string; // max 10 words (~60 chars)
  description: string; // 1 sentence (~200 chars)
  longDescription: string; // 1-2 paragraphs (~1000 chars)

  // Temporal - supports BCE/CE dates (past and future)
  type: EventType;
  startDate: string; // Extended ISO 8601 (stored as string for BCE support)
  endDate?: string; // Extended ISO 8601, required if type === 'span'
  datePrecision: DatePrecision;

  // Location (optional)
  location?: EventLocation;

  // Sources
  sources: EventSource[];

  // Display
  status: EventStatus;

  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601

  // Extensibility
  metadata?: Record<string, unknown>;
  tags?: string[];
}

/**
 * Track allows visual grouping and layering of events.
 * Enables features like comparing timelines or categorizing events.
 */
export interface Track {
  id: string; // UUID v4
  timelineId: string;
  name: string; // e.g., "Main", "Staged", "Political Events"
  type: TrackType;
  color: TrackColor;
  order: number; // Display order (lower = higher on screen)
  visible: boolean;

  // Extensibility
  metadata?: Record<string, unknown>;
}

/**
 * Timeline is the top-level container for a timeline and its events.
 */
export interface Timeline {
  id: string; // UUID v4
  title: string; // max 100 chars
  description: string; // max 500 chars
  ownerId: string | null; // User ID (null for anonymous timelines)
  visibility: TimelineVisibility;
  tracks: Track[];
  events: TimelineEvent[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601

  // Extensibility
  metadata?: Record<string, unknown>;
}

/**
 * Event layout information for rendering.
 * Used by the stacking algorithm (max 8 lanes per track).
 */
export interface EventLayout {
  eventId: string;
  x: number; // Horizontal position (from date)
  width: number; // Width (1px for points, calculated for spans)
  lane: number; // Vertical lane within track (0-7)
  collapsed: boolean; // True if in overflow "+N more" group
}

/**
 * Timeline boundary calculation result.
 */
export interface TimelineBounds {
  dataStart: string; // Earliest event date
  dataEnd: string; // Latest event date
  viewStart: string; // Padded + snapped start
  viewEnd: string; // Padded + snapped end
  snapUnit: 'day' | 'month' | 'year' | 'decade' | 'century' | 'millennium';
}
