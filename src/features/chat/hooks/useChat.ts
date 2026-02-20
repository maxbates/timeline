'use client';

/**
 * useChat Hook
 *
 * Manages chat state, streaming, and event generation.
 * Chat history is ephemeral (session-only).
 * Based on Spec.md Section 2.8: Chat Panel
 */

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, ChatContext, TimelineEvent, TimelineBounds } from '@/types';

interface UseChatOptions {
  timelineId: string;
  stagingTrackId?: string;
  bounds?: TimelineBounds;
  apiKey?: string;
  onEventsGenerated?: (events: Partial<TimelineEvent>[]) => void;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string, context?: ChatContext) => Promise<void>;
  clearMessages: () => void;
}

/**
 * Generate a unique message ID
 */
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Hook for managing chat state and API interactions
 */
export function useChat({
  timelineId,
  stagingTrackId,
  bounds,
  apiKey,
  onEventsGenerated,
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Abort controller for canceling requests
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Send a message and receive streaming response
   */
  const sendMessage = useCallback(
    async (content: string, context?: ChatContext) => {
      // Cancel any existing request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      // Clear previous error
      setError(null);

      // Add user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content,
        status: 'complete',
        createdAt: new Date().toISOString(),
      };

      // Add placeholder for assistant response
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        status: 'streaming',
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsLoading(true);

      try {
        const response = await fetch(`/api/timelines/${timelineId}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'X-API-Key': apiKey } : {}),
          },
          body: JSON.stringify({
            message: content,
            context,
            bounds,
            stagingTrackId,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        // Read streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let generatedEventIds: string[] = [];
        const streamedEvents: Partial<TimelineEvent>[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          // Parse SSE events
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === 'loading') {
                  // Show loading message
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessage.id
                        ? { ...m, content: parsed.content || 'Generating...', status: 'streaming' }
                        : m
                    )
                  );
                } else if (parsed.type === 'event') {
                  // Single event streamed in
                  streamedEvents.push(parsed.event);
                  onEventsGenerated?.([parsed.event]);
                  // Update message to show the streamed events (will be displayed by ChatMessage component)
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessage.id
                        ? {
                            ...m,
                            content: '', // Clear content, events will be shown via generatedEvents
                            generatedEvents: [...streamedEvents], // Update with all events so far
                          }
                        : m
                    )
                  );
                } else if (parsed.type === 'text_delta') {
                  // Streaming text delta - append to content
                  fullContent += parsed.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessage.id ? { ...m, content: fullContent } : m
                    )
                  );
                } else if (parsed.type === 'text') {
                  fullContent = parsed.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessage.id ? { ...m, content: fullContent } : m
                    )
                  );
                } else if (parsed.type === 'events') {
                  // Just store the event IDs - events are already in streamedEvents from individual 'event' messages
                  generatedEventIds = parsed.eventIds || [];
                  // Don't push events again - they were already added when streamed individually
                }
              } catch {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }

        // Mark message as complete
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? {
                  ...m,
                  // Only show text content if there's actual text, otherwise just show events
                  content: fullContent || '',
                  status: 'complete',
                  generatedEventIds: generatedEventIds.length > 0 ? generatedEventIds : undefined,
                  generatedEvents: streamedEvents.length > 0 ? streamedEvents : undefined,
                }
              : m
          )
        );
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was aborted, don't show error
          return;
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);

        // Mark message as error
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? {
                  ...m,
                  content: 'Sorry, I encountered an error.',
                  status: 'error',
                  error: errorMessage,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [timelineId, stagingTrackId, bounds, apiKey, onEventsGenerated]
  );

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    abortControllerRef.current?.abort();
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}
