'use client';

/**
 * EventDetail Component
 *
 * Displays detailed information about a focused event.
 * Based on Spec.md Section 2.7: Detail Panel
 */

import { memo, useState, useCallback, useEffect } from 'react';
import type { TimelineEvent, Track } from '@/types';
import { formatDateForDisplay } from '@/lib/dates';
import { TRACK_COLORS } from '@/types';
import { EventLocation } from './EventLocation';
import { EventSources } from './EventSources';
import { DigDeeperSection } from './DigDeeperSection';
import { PressAndHoldButton } from '@/components/PressAndHoldButton';

interface EventDetailProps {
  event: TimelineEvent;
  track?: Track;
  apiKey?: string;
  onLearnMore?: () => void;
  onUpdateEvent?: (eventId: string, updates: Partial<TimelineEvent>) => void;
  onDelete?: (eventId: string) => void;
  onDigDeeper?: (prompt: string) => void;
  isDigDeeperGenerating?: boolean;
}

function EventDetailComponent({
  event,
  track,
  apiKey,
  onLearnMore: _onLearnMore,
  onUpdateEvent,
  onDelete,
  onDigDeeper,
  isDigDeeperGenerating = false,
}: EventDetailProps) {
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState('');

  // Reset expanded description when event changes
  useEffect(() => {
    setExpandedDescription(event.longDescription || '');
  }, [event.id, event.longDescription]);

  // Format date range for display
  const dateDisplay =
    event.type === 'span' && event.endDate
      ? `${formatDateForDisplay(event.startDate, event.datePrecision)} – ${formatDateForDisplay(event.endDate, event.datePrecision)}`
      : formatDateForDisplay(event.startDate, event.datePrecision);

  // Get track color
  const trackColor = track ? TRACK_COLORS[track.color] : TRACK_COLORS.blue;

  // Handle delete
  const handleDelete = useCallback(() => {
    onDelete?.(event.id);
  }, [event.id, onDelete]);

  // Handle learn more - stream additional details into the description
  const handleLearnMoreClick = useCallback(async () => {
    if (isLoadingDetails) return;

    setIsLoadingDetails(true);

    try {
      const response = await fetch(
        `/api/timelines/${event.timelineId}/events/${event.id}/details`,
        {
          method: 'POST',
          headers: {
            ...(apiKey ? { 'X-API-Key': apiKey } : {}),
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch details');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Read streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = event.longDescription || '';

      // Add a separator if there's existing content
      if (accumulatedText) {
        accumulatedText += '\n\n';
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'text_delta' && parsed.content) {
                accumulatedText += parsed.content;
                setExpandedDescription(accumulatedText);
              } else if (parsed.type === 'done') {
                // Update the event with the new description
                onUpdateEvent?.(event.id, { longDescription: accumulatedText });
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [event.id, event.timelineId, event.longDescription, isLoadingDetails, onUpdateEvent, apiKey]);

  // Check if event has map
  const hasMap = event.location?.latitude !== undefined && event.location?.longitude !== undefined;

  // Use expanded description if we're loading or have loaded more details
  const displayDescription = expandedDescription || event.longDescription;

  // Detect research-enriched event
  const metadata = (event.metadata ?? {}) as Record<string, unknown>;
  const imageUrl = (metadata.imageUrl as string) || (metadata.thumbnailUrl as string) || null;
  const digDeeperSuggestions = (metadata.digDeeperSuggestions as string[]) || [];
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [heroError, setHeroError] = useState(false);
  const [heroHovered, setHeroHovered] = useState(false);

  // Reset hero state when event changes
  useEffect(() => {
    setHeroLoaded(false);
    setHeroError(false);
    setHeroHovered(false);
  }, [event.id]);

  // Determine if we have right-side content
  const hasRightContent =
    hasMap ||
    (onDigDeeper && digDeeperSuggestions.length > 0) ||
    (event.tags && event.tags.length > 0) ||
    (event.sources && event.sources.length > 0) ||
    event.location?.name;
  const showHeroImage = imageUrl && !heroError;

  return (
    <div className="flex h-full flex-col">
      {/* Header with track color indicator and actions */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-start gap-3">
          <div
            className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
            style={{ backgroundColor: trackColor }}
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-900">{event.title}</h2>
            <p className="mt-0.5 text-sm text-gray-500">{dateDisplay}</p>
            {track && <p className="mt-0.5 text-xs text-gray-400">{track.name}</p>}
          </div>
          <div className="flex items-start gap-2">
            {event.status === 'staged' && (
              <span className="flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Staged
              </span>
            )}
            {onDelete && (
              <PressAndHoldButton
                onComplete={handleDelete}
                duration={1500}
                className="flex-shrink-0 rounded-lg border border-gray-300 bg-white p-1.5 text-gray-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                title="Press and hold to delete event"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </PressAndHoldButton>
            )}
          </div>
        </div>
      </div>

      {/* Content — two-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column: image + text */}
        <div
          className={`flex flex-col overflow-y-auto ${hasRightContent ? 'flex-1 border-r border-gray-200' : 'flex-1'}`}
        >
          {/* Hero image */}
          {showHeroImage && (
            <div
              className="relative flex-shrink-0 overflow-hidden"
              style={{ minHeight: '200px', maxHeight: '300px' }}
              onMouseEnter={() => setHeroHovered(true)}
              onMouseLeave={() => setHeroHovered(false)}
            >
              {!heroLoaded && <div className="absolute inset-0 animate-pulse bg-gray-100" />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={event.title}
                className={`h-full w-full object-cover transition-opacity duration-300 ${
                  heroHovered ? 'opacity-100' : 'opacity-35'
                }`}
                onLoad={() => setHeroLoaded(true)}
                onError={() => setHeroError(true)}
              />
              <div
                className={`absolute inset-0 flex flex-col justify-end p-4 transition-all duration-300 ${
                  heroHovered ? 'opacity-0' : 'opacity-100'
                }`}
              >
                <p className="text-xs text-white/60">Wikimedia Commons</p>
              </div>
            </div>
          )}

          {/* Text content */}
          <div className="space-y-4 p-4">
            <p className="text-sm text-gray-700">{event.description}</p>

            <button
              onClick={handleLearnMoreClick}
              disabled={isLoadingDetails}
              className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoadingDetails ? (
                <>
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
                  Loading...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Learn More
                </>
              )}
            </button>

            {displayDescription && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Details</h4>
                <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
                  {displayDescription}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: map + metadata (only render if there's content) */}
        {hasRightContent && (
          <div className="flex w-72 flex-shrink-0 flex-col overflow-y-auto">
            {/* Map */}
            {hasMap && (
              <div
                className="flex-shrink-0 border-b border-gray-200"
                style={{ minHeight: '200px', maxHeight: '300px' }}
              >
                <EventLocation location={event.location!} mapOnly fullHeight />
              </div>
            )}

            {/* Metadata */}
            <div className="space-y-4 p-4">
              {/* Location name */}
              {event.location?.name && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Location</h4>
                  <div className="mt-1.5 flex items-center gap-2 text-gray-700">
                    <svg
                      className="h-4 w-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="text-sm">{event.location.name}</span>
                  </div>
                </div>
              )}

              {/* Dig Deeper */}
              {onDigDeeper && digDeeperSuggestions.length > 0 && (
                <DigDeeperSection
                  suggestions={digDeeperSuggestions}
                  onDigDeeper={onDigDeeper}
                  isGenerating={isDigDeeperGenerating}
                />
              )}

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Tags</h4>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {event.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              <EventSources sources={event.sources} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const EventDetail = memo(EventDetailComponent);
