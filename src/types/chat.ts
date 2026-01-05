/**
 * Chat Message Types
 * Based on Spec.md Section 1.4: Chat Messages (Ephemeral)
 *
 * Chat history is not persisted — it exists only in the current session
 * and is cleared on page reload. Only timelines and events are saved.
 */

export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessageStatus = 'pending' | 'streaming' | 'complete' | 'error';

/**
 * ChatMessage represents a message in the chat interface for LLM interaction.
 * Messages are ephemeral (session-only, not persisted to database).
 */
export interface ChatMessage {
  id: string; // UUID v4 (client-generated)
  role: ChatRole;
  content: string;

  // If assistant message contains events
  generatedEventIds?: string[]; // References to staged events
  generatedEvents?: Array<{ id?: string; title?: string }>; // Event data for display

  createdAt: string; // ISO 8601

  // For streaming responses
  status: ChatMessageStatus;
  error?: string;
}

/**
 * Chat generation context for LLM requests.
 */
export interface ChatContext {
  focusedEventId?: string; // For "learn more" or "similar events"
  action?: 'generate' | 'learn_more' | 'similar_events';
}

/**
 * Request to send a chat message and generate events.
 */
export interface SendChatMessageRequest {
  message: string;
  context?: ChatContext;
}
