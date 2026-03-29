'use client';

/**
 * ChatInput Component
 *
 * Text input with send button and Quick/Research mode toggle.
 * Based on Spec.md Section 2.8: Chat Panel
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { ModeToggle, type ChatMode } from './ModeToggle';

const MODE_STORAGE_KEY = 'timeline-mode';

function getInitialMode(): ChatMode {
  try {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    if (stored === 'quick' || stored === 'research') return stored;
  } catch {
    // localStorage unavailable
  }
  return 'research';
}

interface ChatInputProps {
  onSend: (message: string, mode: ChatMode) => void;
  disabled?: boolean;
  placeholder?: string;
  isGenerating?: boolean;
}

function ChatInputComponent({
  onSend,
  disabled = false,
  placeholder = 'Type a topic to explore...',
  isGenerating = false,
}: ChatInputProps) {
  const [chatMode, setChatMode] = useState<ChatMode>(getInitialMode);
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  }, [value]);

  const handleToggleMode = useCallback(() => {
    setChatMode((prev) => {
      const next: ChatMode = prev === 'research' ? 'quick' : 'research';
      try {
        localStorage.setItem(MODE_STORAGE_KEY, next);
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed, chatMode);
    setValue('');
  }, [value, disabled, onSend, chatMode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="flex items-end gap-2 border-t border-gray-200 bg-white p-3">
      {/* Mode toggle */}
      <ModeToggle mode={chatMode} onToggle={handleToggleMode} disabled={isGenerating} />

      {/* Text input */}
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
        />
      </div>

      {/* Send button */}
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        title="Send message"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      </button>
    </div>
  );
}

export const ChatInput = memo(ChatInputComponent);
