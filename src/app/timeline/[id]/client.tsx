'use client';

/**
 * TimelineViewerClient Component
 *
 * Client-side container for the three-panel timeline layout.
 * Based on Spec.md Section 2.1: Layout Structure
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import type { Timeline, TimelineEvent } from '@/types';
import { Header } from '@/features/header';
import { TimelineViewer } from '@/features/timeline';
import { DetailPanel } from '@/features/detail-panel';
import { ChatPanel, StagedEventsBar, type ChatPanelHandle } from '@/features/chat';
import { calculateTimelineBounds } from '@/features/timeline/utils/bounds';

interface TimelineViewerClientProps {
  timeline: Timeline;
}

export function TimelineViewerClient({ timeline: initialTimeline }: TimelineViewerClientProps) {
  const [timeline, setTimeline] = useState(initialTimeline);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const chatPanelRef = useRef<ChatPanelHandle>(null);

  // Get staged events
  const stagedEvents = useMemo(
    () => timeline.events.filter((e) => e.status === 'staged'),
    [timeline.events]
  );

  // Create a client-side staging track ID
  const stagingTrackId = `staging_${timeline.id}`;

  // Create timeline with dynamic staging track (client-side only, not persisted)
  const timelineWithStaging = useMemo(() => {
    // Check if we already have a staging track
    const hasStagingTrack = timeline.tracks.some((t) => t.type === 'staging');

    // Only add staging track if we have staged events and no staging track exists
    if (stagedEvents.length > 0 && !hasStagingTrack) {
      return {
        ...timeline,
        tracks: [
          ...timeline.tracks,
          {
            id: stagingTrackId,
            timelineId: timeline.id,
            name: 'Staging',
            type: 'staging' as const,
            color: 'green' as const,
            order: 999, // Put at the end
            visible: true,
          },
        ],
      };
    }

    return timeline;
  }, [timeline, stagedEvents.length, stagingTrackId]);

  // Calculate bounds
  const bounds = useMemo(
    () => calculateTimelineBounds(timelineWithStaging.events),
    [timelineWithStaging.events]
  );

  // Get selected event's track
  const selectedTrack = useMemo(
    () =>
      selectedEvent
        ? timelineWithStaging.tracks.find((t) => t.id === selectedEvent.trackId)
        : undefined,
    [selectedEvent, timelineWithStaging.tracks]
  );

  // Handle event selection
  const handleEventSelect = useCallback((event: TimelineEvent | null) => {
    setSelectedEvent(event);
  }, []);

  // Handle event click from chat
  const handleEventClick = useCallback(
    (eventId: string) => {
      const event = timeline.events.find((e) => e.id === eventId);
      if (event) {
        setSelectedEvent(event);
      }
    },
    [timeline.events]
  );

  // Handle events generated from chat
  const handleEventsGenerated = useCallback((events: Partial<TimelineEvent>[]) => {
    setTimeline((prev) => ({
      ...prev,
      events: [...prev.events, ...(events as TimelineEvent[])],
    }));
  }, []);

  // Handle manual event creation
  const handleCreateEvent = useCallback(
    async (event: Partial<TimelineEvent>) => {
      try {
        const response = await fetch(`/api/timelines/${timeline.id}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });

        if (response.ok) {
          const createdEvent = await response.json();
          setTimeline((prev) => ({
            ...prev,
            events: [...prev.events, createdEvent],
          }));
        }
      } catch (error) {
        console.error('Failed to create event:', error);
      }
    },
    [timeline.id]
  );

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await fetch(`/api/timelines/${timeline.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: timeline.title,
          description: timeline.description,
        }),
      });
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  }, [timeline]);

  // Handle add to main track
  const handleAddToMainTrack = useCallback(async () => {
    const eventIds = stagedEvents.map((e) => e.id);
    if (eventIds.length === 0) return;

    const mainTrack = timeline.tracks.find((t) => t.type === 'main');
    if (!mainTrack) return;

    try {
      const response = await fetch(`/api/timelines/${timeline.id}/events/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventIds,
          targetTrackId: mainTrack.id,
          events: stagedEvents, // Send the full event data for client-side staged events
        }),
      });

      if (response.ok) {
        const { events } = await response.json();
        setTimeline((prev) => ({
          ...prev,
          events: [
            // Remove old staged events (client-side only)
            ...prev.events.filter((e) => !eventIds.includes(e.id)),
            // Add new confirmed events from database
            ...events,
          ],
        }));
      }
    } catch (error) {
      console.error('Failed to move events to main track:', error);
    }
  }, [timeline.id, timeline.tracks, stagedEvents]);

  // Handle add to new track
  const handleAddToNewTrack = useCallback(async () => {
    const eventIds = stagedEvents.map((e) => e.id);
    if (eventIds.length === 0) return;

    try {
      // Check if there's already an empty "New Track"
      const existingNewTrack = timeline.tracks.find(
        (t) => t.name === 'New Track' && t.type === 'custom'
      );

      // Check if this track is empty (has no confirmed events)
      const trackHasEvents = existingNewTrack
        ? timeline.events.some((e) => e.trackId === existingNewTrack.id && e.status === 'confirmed')
        : false;

      let targetTrackId: string;
      let newTrack = null;

      if (existingNewTrack && !trackHasEvents) {
        // Reuse existing empty "New Track"
        targetTrackId = existingNewTrack.id;
      } else {
        // Create new track
        const trackResponse = await fetch(`/api/timelines/${timeline.id}/tracks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'New Track',
            type: 'custom',
            color: 'purple',
            order: timeline.tracks.length,
          }),
        });

        if (!trackResponse.ok) return;

        newTrack = await trackResponse.json();
        targetTrackId = newTrack.id;
      }

      // Move events to target track
      const moveResponse = await fetch(`/api/timelines/${timeline.id}/events/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventIds,
          targetTrackId,
          events: stagedEvents, // Send the full event data for client-side staged events
        }),
      });

      if (moveResponse.ok) {
        const { events } = await moveResponse.json();
        setTimeline((prev) => ({
          ...prev,
          tracks: newTrack ? [...prev.tracks, newTrack] : prev.tracks,
          events: [
            // Remove old staged events (client-side only)
            ...prev.events.filter((e) => !eventIds.includes(e.id)),
            // Add new confirmed events from database
            ...events,
          ],
        }));
      }
    } catch (error) {
      console.error('Failed to create new track and move events:', error);
    }
  }, [timeline.id, timeline.tracks, timeline.events, stagedEvents]);

  // Handle reject all staged events
  const handleRejectAll = useCallback(async () => {
    const eventIds = stagedEvents.map((e) => e.id);
    if (eventIds.length === 0) return;

    try {
      const response = await fetch(`/api/timelines/${timeline.id}/events/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventIds }),
      });

      if (response.ok) {
        setTimeline((prev) => ({
          ...prev,
          events: prev.events.filter((e) => !eventIds.includes(e.id)),
        }));
      }
    } catch (error) {
      console.error('Failed to reject events:', error);
    }
  }, [timeline.id, stagedEvents]);

  // Handle learn more
  const handleLearnMore = useCallback(() => {
    if (!selectedEvent || !chatPanelRef.current) return;

    // Send a message to the chat to learn more about the selected event
    const message = `Tell me more about "${selectedEvent.title}". Provide additional details and context in a couple of paragraphs.`;
    chatPanelRef.current.sendMessage(message, {
      focusedEventId: selectedEvent.id,
      action: 'learn_more',
    });
  }, [selectedEvent]);

  // Handle update event
  const handleUpdateEvent = useCallback(
    async (eventId: string, updates: Partial<TimelineEvent>) => {
      try {
        const response = await fetch(`/api/timelines/${timeline.id}/events/${eventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (response.ok) {
          const updatedEvent = await response.json();
          setTimeline((prev) => ({
            ...prev,
            events: prev.events.map((e) => (e.id === eventId ? updatedEvent : e)),
          }));
          // Also update the selected event if it's the one being updated
          setSelectedEvent((prev) => (prev?.id === eventId ? updatedEvent : prev));
        }
      } catch (error) {
        console.error('Failed to update event:', error);
      }
    },
    [timeline.id]
  );

  // Handle delete event
  const handleDeleteEvent = useCallback(
    async (eventId: string) => {
      try {
        const response = await fetch(`/api/timelines/${timeline.id}/events/${eventId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setTimeline((prev) => ({
            ...prev,
            events: prev.events.filter((e) => e.id !== eventId),
          }));
          setSelectedEvent(null);
        }
      } catch (error) {
        console.error('Failed to delete event:', error);
      }
    },
    [timeline.id]
  );

  // Handle track name change
  const handleTrackNameChange = useCallback(
    async (trackId: string, newName: string) => {
      try {
        const response = await fetch(`/api/timelines/${timeline.id}/tracks/${trackId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName }),
        });

        if (response.ok) {
          const updatedTrack = await response.json();
          setTimeline((prev) => ({
            ...prev,
            tracks: prev.tracks.map((t) => (t.id === trackId ? updatedTrack : t)),
          }));
        }
      } catch (error) {
        console.error('Failed to update track name:', error);
      }
    },
    [timeline.id]
  );

  // Handle chat about track
  const handleChatAboutTrack = useCallback((trackName: string) => {
    if (!chatPanelRef.current) return;

    // Send a message to the chat to generate more events for this track
    const message = `Generate more events for the "${trackName}" track that fit the timeline's theme and time period.`;
    chatPanelRef.current.sendMessage(message);
  }, []);

  // Handle create track
  const handleCreateTrack = useCallback(async () => {
    try {
      // Find the highest order number
      const maxOrder = Math.max(...timeline.tracks.map((t) => t.order), -1);

      // Determine track color (cycle through available colors)
      const colors: Array<'blue' | 'red' | 'green' | 'purple' | 'orange' | 'pink' | 'teal'> = [
        'blue',
        'red',
        'green',
        'purple',
        'orange',
        'pink',
        'teal',
      ];
      const usedColors = timeline.tracks.map((t) => t.color);
      const availableColors = colors.filter((c) => !usedColors.includes(c));
      const newColor = availableColors.length > 0 ? availableColors[0] : colors[0];

      const response = await fetch(`/api/timelines/${timeline.id}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Track',
          type: 'custom',
          color: newColor,
          order: maxOrder + 1,
        }),
      });

      if (response.ok) {
        const newTrack = await response.json();
        setTimeline((prev) => ({
          ...prev,
          tracks: [...prev.tracks, newTrack],
        }));
      }
    } catch (error) {
      console.error('Failed to create track:', error);
    }
  }, [timeline.id, timeline.tracks]);

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <Header timeline={timelineWithStaging} onSave={handleSave} isSaving={isSaving} />

      {/* Staged events bar */}
      {stagedEvents.length > 0 && (
        <StagedEventsBar
          stagedEvents={stagedEvents}
          onAddToMainTrack={handleAddToMainTrack}
          onAddToNewTrack={handleAddToNewTrack}
          onRejectAll={handleRejectAll}
        />
      )}

      {/* Main content - two column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Timeline + Detail stacked */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Timeline */}
          <main className={`overflow-hidden ${selectedEvent ? 'min-h-[300px] flex-1' : 'flex-1'}`}>
            <TimelineViewer
              timeline={timelineWithStaging}
              onEventSelect={handleEventSelect}
              onCreateEvent={handleCreateEvent}
              onCreateTrack={handleCreateTrack}
              onTrackNameChange={handleTrackNameChange}
              onChatAboutTrack={handleChatAboutTrack}
              className="h-full"
            />
          </main>

          {/* Detail panel below timeline */}
          {selectedEvent && (
            <aside className="max-h-[60vh] min-h-[400px] flex-1 flex-shrink-0 overflow-hidden border-t border-gray-200">
              <DetailPanel
                event={selectedEvent}
                track={selectedTrack}
                onLearnMore={handleLearnMore}
                onUpdateEvent={handleUpdateEvent}
                onDelete={handleDeleteEvent}
                className="h-full"
              />
            </aside>
          )}
        </div>

        {/* Right panel: Chat */}
        <aside className="w-96 max-w-96 flex-shrink-0 overflow-hidden">
          <ChatPanel
            ref={chatPanelRef}
            timelineId={timeline.id}
            stagingTrackId={stagingTrackId}
            bounds={bounds || undefined}
            focusedEvent={selectedEvent}
            eventCount={timeline.events.filter((e) => e.status === 'confirmed').length}
            onEventsGenerated={handleEventsGenerated}
            onEventClick={handleEventClick}
            className="h-full"
          />
        </aside>
      </div>
    </div>
  );
}
