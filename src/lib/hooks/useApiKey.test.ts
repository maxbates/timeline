import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApiKey, getStoredApiKey } from './useApiKey';

const STORAGE_KEY = 'anthropic-api-key';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('getStoredApiKey', () => {
  it('returns null when no key is stored', () => {
    expect(getStoredApiKey()).toBeNull();
  });

  it('returns the stored key', () => {
    localStorage.setItem(STORAGE_KEY, 'sk-ant-test123');
    expect(getStoredApiKey()).toBe('sk-ant-test123');
  });
});

describe('useApiKey', () => {
  it('returns empty string and hasApiKey=false when no key is stored', () => {
    const { result } = renderHook(() => useApiKey());
    expect(result.current.apiKey).toBe('');
    expect(result.current.hasApiKey).toBe(false);
  });

  it('initialises from localStorage when a key exists', () => {
    localStorage.setItem(STORAGE_KEY, 'sk-ant-existing');
    const { result } = renderHook(() => useApiKey());
    expect(result.current.apiKey).toBe('sk-ant-existing');
    expect(result.current.hasApiKey).toBe(true);
  });

  it('setApiKey stores the trimmed key in localStorage and updates state', () => {
    const { result } = renderHook(() => useApiKey());

    act(() => {
      result.current.setApiKey('  sk-ant-newkey  ');
    });

    expect(result.current.apiKey).toBe('sk-ant-newkey');
    expect(result.current.hasApiKey).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('sk-ant-newkey');
  });

  it('setApiKey with empty/whitespace string removes the key', () => {
    localStorage.setItem(STORAGE_KEY, 'sk-ant-existing');
    const { result } = renderHook(() => useApiKey());

    act(() => {
      result.current.setApiKey('   ');
    });

    expect(result.current.apiKey).toBe('');
    expect(result.current.hasApiKey).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clearApiKey removes the key from localStorage and updates state', () => {
    localStorage.setItem(STORAGE_KEY, 'sk-ant-existing');
    const { result } = renderHook(() => useApiKey());

    act(() => {
      result.current.clearApiKey();
    });

    expect(result.current.apiKey).toBe('');
    expect(result.current.hasApiKey).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
