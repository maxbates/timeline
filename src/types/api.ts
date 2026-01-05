/**
 * API Request/Response Types
 * Based on Spec.md Section 4: API Endpoints
 */

import type { Timeline, TimelineEvent, TimelineVisibility } from './timeline';

// Timeline CRUD

export interface CreateTimelineRequest {
  title: string;
  description?: string;
}

export interface UpdateTimelineRequest {
  title?: string;
  description?: string;
  visibility?: TimelineVisibility;
}

export interface ListTimelinesResponse {
  timelines: Timeline[];
}

// Events CRUD

export type CreateEventInput = Omit<TimelineEvent, 'id' | 'timelineId' | 'createdAt' | 'updatedAt'>;

export interface CreateEventsRequest {
  events: CreateEventInput[];
}

export interface CreateEventsResponse {
  events: TimelineEvent[];
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  longDescription?: string;
  startDate?: string;
  endDate?: string;
  datePrecision?: TimelineEvent['datePrecision'];
  location?: TimelineEvent['location'];
  sources?: TimelineEvent['sources'];
  tags?: string[];
}

// Staged Events

export interface AcceptEventsRequest {
  eventIds: string[];
}

export interface AcceptEventsResponse {
  events: TimelineEvent[];
}

export interface RejectEventsRequest {
  eventIds: string[];
}

// Sharing

export interface ShareTimelineRequest {
  visibility: 'unlisted' | 'public';
}

export interface ShareTimelineResponse {
  shareUrl: string;
}

// Error Response

export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

// Success Response

export interface SuccessResponse {
  success: boolean;
}
