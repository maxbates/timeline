'use client';

/**
 * ShareDialog Component
 *
 * Modal for sharing timeline with visibility options.
 * Based on Spec.md Section 2.9: Share Flow
 */

import { memo, useState, useCallback, useEffect } from 'react';
import type { Timeline, TimelineVisibility } from '@/types';

interface ShareDialogProps {
  timeline: Timeline;
  isOpen: boolean;
  onClose: () => void;
}

const visibilityOptions: {
  value: TimelineVisibility;
  label: string;
  description: string;
}[] = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can view this timeline',
  },
  {
    value: 'unlisted',
    label: 'Unlisted',
    description: 'Anyone with the link can view',
  },
  {
    value: 'public',
    label: 'Public',
    description: 'Discoverable by anyone',
  },
];

function ShareDialogComponent({ timeline, isOpen, onClose }: ShareDialogProps) {
  const [visibility, setVisibility] = useState<TimelineVisibility>(timeline.visibility);
  const [shareUrl, setShareUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate share URL when dialog opens
  useEffect(() => {
    if (isOpen) {
      const baseUrl =
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      setShareUrl(`${baseUrl}/timeline/${timeline.id}`);
      setVisibility(timeline.visibility);
    }
  }, [isOpen, timeline.id, timeline.visibility]);

  // Handle visibility change
  const handleVisibilityChange = useCallback(
    async (newVisibility: TimelineVisibility) => {
      setVisibility(newVisibility);
      setIsLoading(true);

      try {
        const response = await fetch(`/api/timelines/${timeline.id}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visibility: newVisibility }),
        });

        if (response.ok) {
          const data = await response.json();
          setShareUrl(data.shareUrl);
        }
      } catch (error) {
        console.error('Failed to update visibility:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [timeline.id]
  );

  // Copy URL to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [shareUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Share Timeline</h2>
          <button
            onClick={onClose}
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

        {/* Visibility options */}
        <div className="mb-6 space-y-2">
          <p className="text-sm font-medium text-gray-700">Who can view</p>
          {visibilityOptions.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                visibility === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="visibility"
                value={option.value}
                checked={visibility === option.value}
                onChange={() => handleVisibilityChange(option.value)}
                disabled={isLoading}
                className="mt-0.5"
              />
              <div>
                <p className="font-medium text-gray-900">{option.label}</p>
                <p className="text-sm text-gray-500">{option.description}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Share URL */}
        {visibility !== 'private' && (
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-gray-700">Share link</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
              />
              <button
                onClick={handleCopy}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  copied ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export const ShareDialog = memo(ShareDialogComponent);
