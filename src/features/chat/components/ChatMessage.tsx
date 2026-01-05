'use client';

/**
 * ChatMessage Component
 *
 * Renders a single chat message (user or assistant).
 * Based on Spec.md Section 2.8: Chat Panel
 */

import { memo } from 'react';
import type { ChatMessage as ChatMessageType } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
  onEventClick?: (eventId: string) => void;
}

function ChatMessageComponent({ message, onEventClick }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isStreaming = message.status === 'streaming';
  const hasError = message.status === 'error';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-blue-500 text-white'
            : hasError
              ? 'bg-red-50 text-red-700'
              : 'bg-gray-100 text-gray-900'
        }`}
      >
        {/* Message content */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
          {isStreaming && <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-current" />}
        </div>

        {/* Error message */}
        {hasError && message.error && <p className="mt-2 text-xs text-red-500">{message.error}</p>}

        {/* Generated events */}
        {isAssistant && message.generatedEvents && message.generatedEvents.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-gray-200 pt-2">
            {message.generatedEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => event.id && onEventClick?.(event.id)}
                className="block w-full rounded px-2 py-1 text-left text-xs text-gray-700 transition-colors hover:bg-white/80"
              >
                {event.title || 'Untitled event'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const ChatMessage = memo(ChatMessageComponent);
