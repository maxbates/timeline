'use client';

/**
 * ChatMessage Component
 *
 * Renders a single chat message (user or assistant).
 * Based on Spec.md Section 2.8: Chat Panel
 */

import { memo, useState } from 'react';
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
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

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
        {/* Message content - only show if there's text content */}
        {message.content && (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
            {isStreaming && !message.generatedEvents?.length && (
              <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-current" />
            )}
          </div>
        )}

        {/* Research sources (expandable) */}
        {isAssistant && message.researchSources && message.researchSources.length > 0 && (
          <div className="mt-1">
            <button
              onClick={() => setSourcesExpanded(!sourcesExpanded)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              aria-expanded={sourcesExpanded}
            >
              <svg
                className={`h-3 w-3 transition-transform ${sourcesExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              {message.researchSources.length} Wikipedia source
              {message.researchSources.length === 1 ? '' : 's'}
            </button>
            {sourcesExpanded && (
              <div className="mt-1 space-y-0.5 pl-4">
                {message.researchSources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-xs text-blue-600 hover:underline"
                  >
                    {source.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loading spinner when streaming with no content yet */}
        {isStreaming && !message.content && !message.generatedEvents?.length && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
            <span>Generating events...</span>
          </div>
        )}

        {/* Error message */}
        {hasError && message.error && <p className="mt-2 text-xs text-red-500">{message.error}</p>}

        {/* Generated events */}
        {isAssistant && message.generatedEvents && message.generatedEvents.length > 0 && (
          <div className={message.content ? 'mt-2' : ''}>
            {/* Header */}
            <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-gray-600">
              {isStreaming && (
                <svg className="h-4 w-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
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
              )}
              <span>
                {isStreaming
                  ? 'Generating events...'
                  : `Generated ${message.generatedEvents.length} event${message.generatedEvents.length === 1 ? '' : 's'}`}
              </span>
            </div>
            {/* Event list */}
            <div className="space-y-1">
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
          </div>
        )}
      </div>
    </div>
  );
}

export const ChatMessage = memo(ChatMessageComponent);
