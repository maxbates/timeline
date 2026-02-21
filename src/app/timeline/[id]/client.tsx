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
import { TimelineViewer, type TimelineViewerHandle } from '@/features/timeline';
import { DetailPanel } from '@/features/detail-panel';
import { ChatPanel, type ChatPanelHandle } from '@/features/chat';
import { calculateTimelineBounds } from '@/features/timeline/utils/bounds';
import { useApiKey } from '@/lib/hooks/useApiKey';
import { ApiKeyDialog } from '@/features/header/components/ApiKeyDialog';

interface TimelineViewerClientProps {
  timeline: Timeline;
}

export function TimelineViewerClient({ timeline: initialTimeline }: TimelineViewerClientProps) {
  const [timeline, setTimeline] = useState(initialTimeline);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isMovingEvents, setIsMovingEvents] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [suggestedTrackName, setSuggestedTrackName] = useState<string | null>(null);
  const chatPanelRef = useRef<ChatPanelHandle>(null);
  const timelineViewerRef = useRef<TimelineViewerHandle>(null);
  const { apiKey, hasApiKey, setApiKey, clearApiKey } = useApiKey();

  // Get staged events
  const stagedEvents = useMemo(
    () => timeline.events.filter((e) => e.status === 'staged'),
    [timeline.events]
  );

  // Create a client-side staging track ID
  const stagingTrackId = `staging_${timeline.id}`;

  // Create timeline with dynamic staging track (client-side only, not persisted)
  // The staging track should ALWAYS be present, but TimelineCanvas will hide it when empty
  const timelineWithStaging = useMemo(() => {
    // Check if we already have a staging track
    const hasStagingTrack = timeline.tracks.some((t) => t.type === 'staging');

    console.log('timelineWithStaging recalculating:', {
      stagedEventsCount: stagedEvents.length,
      hasStagingTrack,
      stagingTrackId,
      timelineTracks: timeline.tracks.map((t) => ({ id: t.id, type: t.type })),
    });

    // If staging track doesn't exist, add it
    if (!hasStagingTrack) {
      console.log('Adding staging track with ID:', stagingTrackId);
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

    // Staging track already exists, return timeline as-is
    console.log('Staging track already exists, returning timeline as-is');
    return timeline;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, stagingTrackId]);

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

  // Handle track title suggested by LLM
  const handleTrackTitleSuggested = useCallback((title: string) => {
    setSuggestedTrackName(title);
  }, []);

  // Handle events generated from chat
  const handleEventsGenerated = useCallback(
    (events: Partial<TimelineEvent>[]) => {
      const newEventIds: string[] = [];

      setTimeline((prev) => {
        const newEvents = events.map((e) => ({
          ...e,
          trackId: e.trackId || stagingTrackId, // Ensure trackId is set
          status: (e.status || 'staged') as 'staged' | 'confirmed',
        })) as TimelineEvent[];

        // Store IDs for zoom
        newEventIds.push(...newEvents.map((e) => e.id));

        console.log('Adding staged events:', {
          count: newEvents.length,
          expectedTrackId: stagingTrackId,
          newEvents: newEvents.map((e) => ({
            id: e.id,
            title: e.title,
            trackId: e.trackId,
            status: e.status,
          })),
          allEventsAfter: [...prev.events, ...newEvents].map((e) => ({
            id: e.id,
            title: e.title,
            trackId: e.trackId,
            status: e.status,
          })),
        });

        return {
          ...prev,
          events: [...prev.events, ...newEvents],
        };
      });

      // Auto-zoom to new events and scroll staging track into view
      setTimeout(() => {
        if (newEventIds.length > 0) {
          timelineViewerRef.current?.zoomToFitEvents(newEventIds);
          timelineViewerRef.current?.scrollToTrack(stagingTrackId);
        }
      }, 100);
    },
    [stagingTrackId]
  );

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

  // Handle accept staged events - reuses empty main track or creates a new one
  const handleAcceptStaged = useCallback(async () => {
    const eventIds = stagedEvents.map((e) => e.id);
    if (eventIds.length === 0 || isMovingEvents) return;

    setIsMovingEvents(true);
    try {
      const trackName = suggestedTrackName || 'New Track';

      // Check if there's an empty main track we can reuse
      const mainTrack = timeline.tracks.find((t) => t.type === 'main');
      const mainTrackEvents = mainTrack
        ? timeline.events.filter((e) => e.trackId === mainTrack.id && e.status === 'confirmed')
        : [];
      const emptyMainTrack = mainTrack && mainTrackEvents.length === 0 ? mainTrack : null;

      let targetTrack;

      if (emptyMainTrack) {
        // Reuse the empty main track - rename it
        const renameResponse = await fetch(
          `/api/timelines/${timeline.id}/tracks/${emptyMainTrack.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: trackName }),
          }
        );
        if (!renameResponse.ok) return;
        targetTrack = await renameResponse.json();
      } else {
        // Create a new track
        const availableColors: Array<'blue' | 'red' | 'purple' | 'orange' | 'pink' | 'teal'> = [
          'blue',
          'red',
          'purple',
          'orange',
          'pink',
          'teal',
        ];
        const usedColors = timeline.tracks.filter((t) => t.type !== 'staging').map((t) => t.color);
        const nextColor =
          availableColors.find((c) => !usedColors.includes(c)) || availableColors[0];

        const trackResponse = await fetch(`/api/timelines/${timeline.id}/tracks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trackName,
            type: 'custom',
            color: nextColor,
            order: timeline.tracks.filter((t) => t.type !== 'staging').length,
          }),
        });
        if (!trackResponse.ok) return;
        targetTrack = await trackResponse.json();
      }

      // Move events to the target track
      const moveResponse = await fetch(`/api/timelines/${timeline.id}/events/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventIds,
          targetTrackId: targetTrack.id,
          events: stagedEvents,
        }),
      });

      if (moveResponse.ok) {
        const { events } = await moveResponse.json();
        setTimeline((prev) => ({
          ...prev,
          tracks: emptyMainTrack
            ? prev.tracks.map((t) => (t.id === targetTrack.id ? targetTrack : t))
            : [...prev.tracks, targetTrack],
          events: [...prev.events.filter((e) => !eventIds.includes(e.id)), ...events],
        }));
        setSuggestedTrackName(null);
      }
    } catch (error) {
      console.error('Failed to accept staged events:', error);
    } finally {
      setIsMovingEvents(false);
    }
  }, [
    timeline.id,
    timeline.tracks,
    timeline.events,
    stagedEvents,
    isMovingEvents,
    suggestedTrackName,
  ]);

  // Handle reject staged events
  const handleRejectStaged = useCallback(async () => {
    const eventIds = stagedEvents.map((e) => e.id);
    if (eventIds.length === 0 || isMovingEvents) return;

    setIsMovingEvents(true);
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
        setSuggestedTrackName(null);
      }
    } catch (error) {
      console.error('Failed to reject events:', error);
    } finally {
      setIsMovingEvents(false);
    }
  }, [timeline.id, stagedEvents, isMovingEvents]);

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

  // Handle track color change
  const handleTrackColorChange = useCallback(
    async (trackId: string, newColor: string) => {
      try {
        const response = await fetch(`/api/timelines/${timeline.id}/tracks/${trackId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ color: newColor }),
        });

        if (response.ok) {
          const updatedTrack = await response.json();
          setTimeline((prev) => ({
            ...prev,
            tracks: prev.tracks.map((t) => (t.id === trackId ? updatedTrack : t)),
          }));
        }
      } catch (error) {
        console.error('Failed to update track color:', error);
      }
    },
    [timeline.id]
  );

  // Handle track deletion
  const handleDeleteTrack = useCallback(
    async (trackId: string) => {
      try {
        const response = await fetch(`/api/timelines/${timeline.id}/tracks/${trackId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setTimeline((prev) => ({
            ...prev,
            tracks: prev.tracks.filter((t) => t.id !== trackId),
            // Also remove events from this track
            events: prev.events.filter((e) => e.trackId !== trackId),
          }));
        }
      } catch (error) {
        console.error('Failed to delete track:', error);
      }
    },
    [timeline.id]
  );

  // Handle chat about track
  const handleChatAboutTrack = useCallback(
    (trackName: string) => {
      if (!chatPanelRef.current) return;

      // Find the track and get its events
      const track = timeline.tracks.find((t) => t.name === trackName);
      if (!track) return;

      const trackEvents = timeline.events.filter(
        (e) => e.trackId === track.id && e.status === 'confirmed'
      );

      // Build a message that includes timeline context and existing events
      let message = `Generate more events for the "${trackName}" track.\n\n`;
      message += `Timeline: "${timeline.title}"\n`;
      message += `Description: ${timeline.description}\n\n`;

      if (trackEvents.length > 0) {
        message += `Existing events in this track:\n`;
        trackEvents.forEach((event) => {
          message += `- ${event.title} (${event.startDate})\n`;
        });
        message += `\nGenerate additional events that complement and expand on these existing events, maintaining the same theme and fitting the timeline's overall topic.`;
      } else {
        message += `This track is currently empty. Generate relevant events that fit the timeline's theme and description.`;
      }

      chatPanelRef.current.sendMessage(message);
    },
    [timeline.tracks, timeline.events, timeline.title, timeline.description]
  );

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
      <Header
        timeline={timelineWithStaging}
        onSave={handleSave}
        isSaving={isSaving}
        hasApiKey={hasApiKey}
        onOpenApiKeyDialog={() => setShowApiKeyDialog(true)}
      />

      {/* Main content - two column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Timeline + Detail stacked */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Timeline */}
          <main className={`overflow-hidden ${selectedEvent ? 'min-h-[300px] flex-1' : 'flex-1'}`}>
            <TimelineViewer
              ref={timelineViewerRef}
              timeline={timelineWithStaging}
              onEventSelect={handleEventSelect}
              onCreateEvent={handleCreateEvent}
              onCreateTrack={handleCreateTrack}
              onTrackNameChange={handleTrackNameChange}
              onTrackColorChange={handleTrackColorChange}
              onTrackDelete={handleDeleteTrack}
              onChatAboutTrack={handleChatAboutTrack}
              onAcceptStaged={handleAcceptStaged}
              onRejectStaged={handleRejectStaged}
              isAcceptingStaged={isMovingEvents || isChatLoading}
              className="h-full"
            />
          </main>

          {/* Detail panel below timeline */}
          {selectedEvent && (
            <aside className="max-h-[60vh] min-h-[400px] flex-1 flex-shrink-0 overflow-hidden border-t border-gray-200">
              <DetailPanel
                event={selectedEvent}
                track={selectedTrack}
                apiKey={apiKey}
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
            apiKey={apiKey}
            eventCount={timeline.events.filter((e) => e.status === 'confirmed').length}
            onEventsGenerated={handleEventsGenerated}
            onTrackTitleSuggested={handleTrackTitleSuggested}
            onEventClick={handleEventClick}
            onLoadingChange={setIsChatLoading}
            onOpenApiKeyDialog={() => setShowApiKeyDialog(true)}
            disabled={stagedEvents.length > 0}
            className="h-full"
          />
        </aside>
      </div>

      {/* API Key Dialog */}
      <ApiKeyDialog
        isOpen={showApiKeyDialog}
        onClose={() => setShowApiKeyDialog(false)}
        currentKey={apiKey}
        onSave={setApiKey}
        onClear={clearApiKey}
      />
    </div>
  );
}
