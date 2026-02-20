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
import { PressAndHoldButton } from '@/components/PressAndHoldButton';

interface EventDetailProps {
  event: TimelineEvent;
  track?: Track;
  apiKey?: string;
  onLearnMore?: () => void;
  onUpdateEvent?: (eventId: string, updates: Partial<TimelineEvent>) => void;
  onDelete?: (eventId: string) => void;
}

function EventDetailComponent({
  event,
  track,
  apiKey,
  onLearnMore: _onLearnMore,
  onUpdateEvent,
  onDelete,
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

  return (
    <div className="flex h-full flex-col">
      {/* Header with track color indicator and actions - fixed at top */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white p-4">
        <div className="flex items-start gap-3">
          {/* Track color indicator */}
          <div
            className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
            style={{ backgroundColor: trackColor }}
          />

          <div className="min-w-0 flex-1">
            {/* Event title */}
            <h2 className="text-lg font-semibold text-gray-900">{event.title}</h2>

            {/* Date */}
            <p className="mt-1 text-sm text-gray-500">{dateDisplay}</p>

            {/* Track name */}
            {track && <p className="mt-0.5 text-xs text-gray-400">{track.name}</p>}
          </div>

          {/* Right side: Status badge and delete button */}
          <div className="flex items-start gap-2">
            {/* Status badge for staged events */}
            {event.status === 'staged' && (
              <span className="flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Staged
              </span>
            )}

            {/* Delete button - press and hold */}
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

        {/* Action buttons for staged events */}
        {event.status === 'staged' && (
          <div className="mt-3 flex items-center gap-2">
            <button className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-600">
              Accept
            </button>
            <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-hidden">
        {hasMap ? (
          /* Split layout: content on left, map on right */
          <div className="flex h-full">
            {/* Left: Text content - scrollable */}
            <div className="flex-1 overflow-y-auto border-r border-gray-200 p-4">
              <div className="space-y-6">
                {/* Short description */}
                <div>
                  <p className="text-sm text-gray-700">{event.description}</p>
                </div>

                {/* Learn More button */}
                <div>
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
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
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
                </div>

                {/* Long description */}
                {displayDescription && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Details</h4>
                    <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
                      {displayDescription}
                    </p>
                  </div>
                )}

                {/* Location name */}
                {event.location && (
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

            {/* Right: Map - full height, fixed width */}
            <div className="w-80 flex-shrink-0 bg-gray-50">
              <EventLocation location={event.location!} mapOnly fullHeight />
            </div>
          </div>
        ) : (
          /* Normal layout: everything stacked - scrollable */
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-6">
              {/* Short description */}
              <div>
                <p className="text-sm text-gray-700">{event.description}</p>
              </div>

              {/* Learn More button */}
              <div>
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
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
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
              </div>

              {/* Long description */}
              {displayDescription && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Details</h4>
                  <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
                    {displayDescription}
                  </p>
                </div>
              )}

              {/* Location */}
              {event.location && <EventLocation location={event.location} />}

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
