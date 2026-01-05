'use client';

/**
 * CreateEventDialog Component
 *
 * Modal dialog for manually creating timeline events.
 */

import { useState, useCallback, useMemo } from 'react';
import type { TimelineEvent, Track, DatePrecision } from '@/types';

interface CreateEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: Partial<TimelineEvent>) => void;
  tracks: Track[];
  defaultTrackId?: string;
}

export function CreateEventDialog({
  isOpen,
  onClose,
  onSubmit,
  tracks,
  defaultTrackId,
}: CreateEventDialogProps) {
  // Filter out staging tracks
  const availableTracks = useMemo(() => tracks.filter((t) => t.type !== 'staging'), [tracks]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    trackId: defaultTrackId || availableTracks[0]?.id || '',
    type: 'point' as 'point' | 'span',
    datePrecision: 'day' as DatePrecision,
    sourceUrl: '',
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.title || !formData.startDate || !formData.trackId) {
        return;
      }

      // Build sources array if URL provided
      const sources = formData.sourceUrl
        ? [
            {
              url: formData.sourceUrl,
              title: formData.title, // Use event title as source title
              type: formData.sourceUrl.toLowerCase().includes('wikipedia')
                ? ('wikipedia' as const)
                : ('other' as const),
            },
          ]
        : [];

      onSubmit({
        title: formData.title,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.type === 'span' ? formData.endDate : undefined,
        trackId: formData.trackId,
        type: formData.type,
        datePrecision: formData.datePrecision,
        sources,
        status: 'confirmed',
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        trackId: defaultTrackId || availableTracks[0]?.id || '',
        type: 'point',
        datePrecision: 'day',
        sourceUrl: '',
      });

      onClose();
    },
    [formData, onSubmit, onClose, defaultTrackId, availableTracks]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Create Event</h2>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
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

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {/* Title */}
          <div>
            <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-gray-900">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="block w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              placeholder="Enter event title"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-gray-900">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="block w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              placeholder="Brief description (optional)"
            />
          </div>

          {/* Source URL */}
          <div>
            <label htmlFor="sourceUrl" className="mb-1.5 block text-sm font-medium text-gray-900">
              Source Link
            </label>
            <input
              type="url"
              id="sourceUrl"
              value={formData.sourceUrl}
              onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
              className="block w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              placeholder="https://en.wikipedia.org/wiki/..."
            />
            {formData.sourceUrl && (
              <p className="mt-1.5 text-xs text-gray-500">
                {formData.sourceUrl.toLowerCase().includes('wikipedia') ? (
                  <span className="text-blue-600">✓ Wikipedia link detected</span>
                ) : (
                  <span>Will be saved as manual source</span>
                )}
              </p>
            )}
          </div>

          {/* Track - only show if multiple tracks */}
          {availableTracks.length > 1 && (
            <div>
              <label htmlFor="track" className="mb-1.5 block text-sm font-medium text-gray-900">
                Track <span className="text-red-500">*</span>
              </label>
              <select
                id="track"
                required
                value={formData.trackId}
                onChange={(e) => setFormData({ ...formData, trackId: e.target.value })}
                className="block w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                {availableTracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Start Date */}
          <div>
            <label htmlFor="startDate" className="mb-1.5 block text-sm font-medium text-gray-900">
              {formData.type === 'span' ? 'Start Date' : 'Date'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="startDate"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="block w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          {/* Event Type Toggle */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900">Event Type</label>
            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, type: formData.type === 'point' ? 'span' : 'point' })
              }
              className="relative inline-flex h-10 w-full items-center rounded-lg border border-gray-200 bg-gray-50 p-1 transition-colors"
            >
              <span
                className={`absolute top-1 left-1 h-8 w-[calc(50%-0.25rem)] rounded-md bg-white shadow-sm transition-transform ${
                  formData.type === 'span' ? 'translate-x-full' : ''
                }`}
              />
              <span
                className={`relative z-10 flex-1 text-sm font-medium transition-colors ${
                  formData.type === 'point' ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                Point in time
              </span>
              <span
                className={`relative z-10 flex-1 text-sm font-medium transition-colors ${
                  formData.type === 'span' ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                Time span
              </span>
            </button>
          </div>

          {/* End Date - only for span */}
          {formData.type === 'span' && (
            <div>
              <label htmlFor="endDate" className="mb-1.5 block text-sm font-medium text-gray-900">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="block w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>
          )}

          {/* Date Precision - only for span */}
          {formData.type === 'span' && (
            <div>
              <label htmlFor="precision" className="mb-1.5 block text-sm font-medium text-gray-900">
                Date Precision
              </label>
              <select
                id="precision"
                value={formData.datePrecision}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    datePrecision: e.target.value as DatePrecision,
                  })
                }
                className="block w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                <option value="day">Day</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
                <option value="datetime">Date & Time</option>
              </select>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
