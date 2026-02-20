'use client';

/**
 * ApiKeyDialog Component
 *
 * Modal for setting the Anthropic API key.
 * Key is stored in localStorage only, never sent to the server for persistence.
 */

import { memo, useState, useCallback } from 'react';

interface ApiKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey: string;
  onSave: (key: string) => void;
  onClear: () => void;
}

function ApiKeyDialogComponent({
  isOpen,
  onClose,
  currentKey,
  onSave,
  onClear,
}: ApiKeyDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleClose = useCallback(() => {
    // Reset state on close
    setInputValue('');
    setError('');
    setSaved(false);
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setError('Please enter an API key.');
      return;
    }
    if (!trimmed.startsWith('sk-ant-')) {
      setError('API key should start with "sk-ant-".');
      return;
    }
    setError('');
    onSave(trimmed);
    setSaved(true);
    setTimeout(() => {
      handleClose();
    }, 600);
  }, [inputValue, onSave, handleClose]);

  const handleClear = useCallback(() => {
    onClear();
    setInputValue('');
    setError('');
    setSaved(false);
  }, [onClear]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      }
    },
    [handleSave]
  );

  if (!isOpen) return null;

  const maskedKey = currentKey ? `${'*'.repeat(12)}${currentKey.slice(-4)}` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">API Key Settings</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Current key status */}
        {currentKey && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="font-mono text-sm text-green-800">{maskedKey}</span>
            </div>
            <button
              onClick={handleClear}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Clear
            </button>
          </div>
        )}

        {/* Input */}
        <div className="mb-2">
          <label htmlFor="api-key-input" className="mb-1 block text-sm font-medium text-gray-700">
            {currentKey ? 'Replace API key' : 'Anthropic API key'}
          </label>
          <input
            id="api-key-input"
            type="password"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError('');
              setSaved(false);
            }}
            onKeyDown={handleKeyDown}
            placeholder="sk-ant-..."
            autoFocus
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>

        {/* Info text */}
        <p className="mb-4 text-xs text-gray-500">
          Stored locally in your browser only. Never saved to the server.
        </p>

        {/* Actions */}
        <button
          onClick={handleSave}
          disabled={!inputValue.trim()}
          className={`w-full rounded-lg py-2 text-sm font-medium transition-colors ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500'
          }`}
        >
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export const ApiKeyDialog = memo(ApiKeyDialogComponent);
