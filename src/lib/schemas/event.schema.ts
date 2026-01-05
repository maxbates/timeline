/**
 * Event Validation Schemas
 * Based on Spec.md Section 9: Zod Validation Schemas
 */

import { z } from 'zod';

// Source type enum
export const sourceTypeSchema = z.enum(['wikipedia', 'article', 'book', 'other']);

// Event source schema
export const eventSourceSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url(),
  type: sourceTypeSchema,
  accessedAt: z.string().datetime().optional(),
});

// Event location schema
export const eventLocationSchema = z.object({
  name: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  placeId: z.string().optional(),
});

// Date precision enum
export const datePrecisionSchema = z.enum(['year', 'month', 'day', 'datetime']);

// Event type enum
export const eventTypeSchema = z.enum(['point', 'span']);

// Event status enum
export const eventStatusSchema = z.enum(['confirmed', 'staged']);

/**
 * Schema for creating a new event.
 * Validates that span events have an end date.
 */
export const createEventSchema = z
  .object({
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    longDescription: z.string().max(5000).default(''),
    type: eventTypeSchema,
    startDate: z.string(), // Extended ISO 8601 (includes BCE dates like "-0753-04-21")
    endDate: z.string().optional(),
    datePrecision: datePrecisionSchema.default('day'),
    location: eventLocationSchema.optional(),
    sources: z.array(eventSourceSchema).default([]),
    tags: z.array(z.string()).default([]),
    trackId: z.string().uuid(),
    status: eventStatusSchema.default('confirmed'),
  })
  .refine((data) => data.type === 'point' || data.endDate !== undefined, {
    message: 'Span events require an end date',
    path: ['endDate'],
  });

/**
 * Schema for updating an existing event.
 * All fields are optional.
 */
export const updateEventSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  longDescription: z.string().max(5000).optional(),
  type: eventTypeSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  datePrecision: datePrecisionSchema.optional(),
  location: eventLocationSchema.optional().nullable(),
  sources: z.array(eventSourceSchema).optional(),
  tags: z.array(z.string()).optional(),
  trackId: z.string().uuid().optional(),
  status: eventStatusSchema.optional(),
});

/**
 * Schema for LLM-generated events (more lenient parsing).
 * Used when parsing JSON from Claude API responses.
 */
export const llmEventSchema = z.object({
  title: z.string(),
  description: z.string(),
  longDescription: z.string().optional().default(''),
  type: eventTypeSchema,
  startDate: z.string(),
  endDate: z.string().optional(),
  datePrecision: datePrecisionSchema.optional().default('day'),
  location: eventLocationSchema.optional(),
  sources: z.array(eventSourceSchema).optional().default([]),
});

/**
 * Schema for array of LLM-generated events.
 */
export const llmEventsResponseSchema = z.array(llmEventSchema);

// Type exports from schemas
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type LLMEventInput = z.infer<typeof llmEventSchema>;
