'use client';

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'anthropic-api-key';

/**
 * Get the stored API key from localStorage (for use outside React components).
 */
export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Hook for managing the Anthropic API key in localStorage.
 * The key is stored locally only and never sent to the server for persistence.
 */
export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_KEY) || '';
  });

  const setApiKey = useCallback((key: string) => {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setApiKeyState(trimmed);
  }, []);

  const clearApiKey = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKeyState('');
  }, []);

  return {
    apiKey,
    hasApiKey: !!apiKey,
    setApiKey,
    clearApiKey,
  };
}
