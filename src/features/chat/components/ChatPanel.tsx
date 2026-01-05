'use client';

/**
 * ChatPanel Component
 *
 * Container for chat interface with message list and input.
 * Based on Spec.md Section 2.8: Chat Panel
 */

import {
  memo,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
} from 'react';
import type { TimelineEvent, TimelineBounds, ChatContext } from '@/types';
import { useChat } from '../hooks/useChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatPanelProps {
  timelineId: string;
  stagingTrackId?: string;
  bounds?: TimelineBounds;
  focusedEvent?: TimelineEvent | null;
  eventCount?: number;
  onEventsGenerated?: (events: Partial<TimelineEvent>[]) => void;
  onEventClick?: (eventId: string) => void;
  className?: string;
}

export interface ChatPanelHandle {
  sendMessage: (content: string, context?: ChatContext) => Promise<void>;
}

function ChatPanelComponent(
  {
    timelineId,
    stagingTrackId,
    bounds,
    focusedEvent,
    eventCount = 0,
    onEventsGenerated,
    onEventClick,
    className = '',
  }: ChatPanelProps,
  ref: React.Ref<ChatPanelHandle>
) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggestions state (persisted across chat clears)
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const { messages, isLoading, sendMessage, clearMessages } = useChat({
    timelineId,
    stagingTrackId,
    bounds,
    onEventsGenerated,
  });

  // Expose sendMessage to parent via ref
  useImperativeHandle(ref, () => ({
    sendMessage,
  }));

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const handleSend = useCallback(
    (content: string) => {
      const context: ChatContext | undefined = focusedEvent
        ? { focusedEventId: focusedEvent.id, action: 'learn_more' }
        : undefined;

      sendMessage(content, context);
    },
    [focusedEvent, sendMessage]
  );

  // Fetch suggestions
  const handleGetSuggestions = useCallback(async () => {
    setIsLoadingSuggestions(true);
    try {
      const response = await fetch(`/api/timelines/${timelineId}/suggestions`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [timelineId]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      // Remove the used suggestion
      setSuggestions((prev) => prev.filter((s) => s !== suggestion));
      // Send the suggestion as a message
      handleSend(suggestion);
    },
    [handleSend]
  );

  return (
    <div className={`flex h-full flex-col border-l border-gray-200 bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="font-medium text-gray-900">Chat</h3>
        {messages.length > 0 && (
          <button onClick={clearMessages} className="text-sm text-gray-500 hover:text-gray-700">
            Clear
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <EmptyState
            eventCount={eventCount}
            suggestions={suggestions}
            isLoadingSuggestions={isLoadingSuggestions}
            onGetSuggestions={handleGetSuggestions}
            onSuggestionClick={handleSuggestionClick}
            onGenerateKeyEvents={() => handleSend('Generate key events for this timeline')}
          />
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} onEventClick={onEventClick} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Context indicator */}
      {focusedEvent && (
        <div className="border-t border-gray-100 bg-blue-50 px-4 py-2">
          <p className="text-xs text-blue-600">
            Asking about: <span className="font-medium">{focusedEvent.title}</span>
          </p>
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isLoading}
        placeholder={
          focusedEvent ? `Ask about "${focusedEvent.title}"...` : 'Ask me to generate events...'
        }
      />
    </div>
  );
}

/**
 * Empty state with suggestions
 */
interface EmptyStateProps {
  eventCount: number;
  suggestions: string[];
  isLoadingSuggestions: boolean;
  onGetSuggestions: () => void;
  onSuggestionClick: (suggestion: string) => void;
  onGenerateKeyEvents: () => void;
}

function EmptyState({
  eventCount,
  suggestions,
  isLoadingSuggestions,
  onGetSuggestions,
  onSuggestionClick,
  onGenerateKeyEvents,
}: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      {/* Icon */}
      <div className="mb-4 rounded-full bg-gray-100 p-3">
        <svg
          className="h-6 w-6 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>

      <h4 className="text-sm font-medium text-gray-900">Start a conversation</h4>

      <p className="mt-1 max-w-xs text-xs text-gray-500">
        Ask me to generate timeline events on any topic.
      </p>

      <div className="mt-6 flex w-full max-w-sm flex-col gap-3">
        {/* Generate key events button - only show if no events */}
        {eventCount === 0 && (
          <button
            onClick={onGenerateKeyEvents}
            className="w-full rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            Generate key events
          </button>
        )}

        {/* Suggestions section */}
        {suggestions.length === 0 ? (
          <button
            onClick={onGetSuggestions}
            disabled={isLoadingSuggestions}
            className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoadingSuggestions ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Loading suggestions...
              </span>
            ) : (
              'Get suggestions'
            )}
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-gray-500">Suggested prompts:</p>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onSuggestionClick(suggestion)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const ChatPanel = memo(forwardRef(ChatPanelComponent));
