/**
 * User Types
 * Based on Spec.md Section 1.5: User
 *
 * Note: Authentication is skipped for MVP.
 * This file defines types for future auth implementation.
 */

import type { TrackColor } from './timeline';

export type DateFormat = 'mdy' | 'dmy' | 'ymd';
export type Theme = 'light' | 'dark' | 'system';

/**
 * User preferences for personalization.
 */
export interface UserPreferences {
  defaultTrackColor: TrackColor;
  dateFormat: DateFormat;
  theme: Theme;
}

/**
 * User model for ownership and authentication.
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt: string; // ISO 8601

  // Preferences
  preferences?: UserPreferences;
}
