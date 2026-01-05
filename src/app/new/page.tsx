'use client';

/**
 * New Timeline Page
 *
 * Form to create a new timeline.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewTimelinePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsLoading(true);

      try {
        const response = await fetch('/api/timelines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description }),
        });

        if (!response.ok) {
          throw new Error('Failed to create timeline');
        }

        const timeline = await response.json();
        router.push(`/timeline/${timeline.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
        setIsLoading(false);
      }
    },
    [title, description, router]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <svg
              className="h-8 w-8 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="text-xl font-bold text-gray-900">Timeline</span>
          </Link>
        </div>
      </header>

      {/* Form */}
      <main className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <h1 className="text-2xl font-bold text-gray-900">Create a Timeline</h1>
          <p className="mt-2 text-gray-600">
            Give your timeline a name and description. You can always change these later.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., The Roman Empire"
                required
                maxLength={100}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of what this timeline covers..."
                rows={3}
                maxLength={500}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Error */}
            {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            {/* Actions */}
            <div className="flex gap-3">
              <Link
                href="/"
                className="flex-1 rounded-lg border border-gray-300 bg-white py-2.5 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={!title.trim() || isLoading}
                className="flex-1 rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {isLoading ? 'Creating...' : 'Create Timeline'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
