/**
 * Timeline Validation Schemas
 * Based on Spec.md Section 9: Zod Validation Schemas
 */

import { z } from 'zod';

// Track color enum
export const trackColorSchema = z.enum([
  'blue',
  'green',
  'red',
  'orange',
  'purple',
  'pink',
  'teal',
  'gray',
]);

// Track type enum
export const trackTypeSchema = z.enum(['main', 'staging', 'custom']);

// Timeline visibility enum
export const timelineVisibilitySchema = z.enum(['private', 'unlisted', 'public']);

/**
 * Schema for creating a new timeline.
 */
export const createTimelineSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
});

/**
 * Schema for updating an existing timeline.
 * All fields are optional.
 */
export const updateTimelineSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  visibility: timelineVisibilitySchema.optional(),
});

/**
 * Schema for creating a new track.
 */
export const createTrackSchema = z.object({
  name: z.string().min(1).max(50),
  type: trackTypeSchema.default('custom'),
  color: trackColorSchema.default('blue'),
  order: z.number().int().min(0).optional(),
  visible: z.boolean().default(true),
});

/**
 * Schema for updating an existing track.
 */
export const updateTrackSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  type: trackTypeSchema.optional(),
  color: trackColorSchema.optional(),
  order: z.number().int().min(0).optional(),
  visible: z.boolean().optional(),
});

/**
 * Schema for sharing a timeline.
 */
export const shareTimelineSchema = z.object({
  visibility: z.enum(['unlisted', 'public']),
});

// Type exports from schemas
export type CreateTimelineInput = z.infer<typeof createTimelineSchema>;
export type UpdateTimelineInput = z.infer<typeof updateTimelineSchema>;
export type CreateTrackInput = z.infer<typeof createTrackSchema>;
export type UpdateTrackInput = z.infer<typeof updateTrackSchema>;
export type ShareTimelineInput = z.infer<typeof shareTimelineSchema>;
