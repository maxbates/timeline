/**
 * Chat Validation Schemas
 * Based on Spec.md Section 9: Zod Validation Schemas
 */

import { z } from 'zod';

// Chat context action types
export const chatActionSchema = z.enum(['generate', 'learn_more', 'similar_events']);

/**
 * Schema for chat context (optional metadata with chat requests).
 */
export const chatContextSchema = z.object({
  focusedEventId: z.string().uuid().optional(),
  action: chatActionSchema.optional(),
});

/**
 * Schema for sending a chat message.
 */
export const sendChatMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  context: chatContextSchema.optional(),
});

// Type exports from schemas
export type ChatContextInput = z.infer<typeof chatContextSchema>;
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
