/**
 * Chat API Route
 *
 * Handles chat messages and streams LLM responses.
 * Based on Spec.md Section 3.3: LLM Integration
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { generateEventsStream, getEventDetailsStream, type LLMEvent } from '@/lib/llm';
import type { TimelineEvent, TimelineBounds } from '@/types';
import { prisma } from '@/lib/db';

// Request validation schema
const chatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  context: z
    .object({
      focusedEventId: z.string().optional(),
      action: z.enum(['generate', 'learn_more', 'similar_events']).optional(),
    })
    .optional(),
  bounds: z
    .object({
      dataStart: z.string(),
      dataEnd: z.string(),
      viewStart: z.string(),
      viewEnd: z.string(),
      snapUnit: z.enum(['day', 'month', 'year', 'decade', 'century', 'millennium']),
    })
    .optional(),
  stagingTrackId: z.string().optional(),
});

// Counter to ensure unique IDs within a single request
let eventCounter = 0;

/**
 * Convert LLM event to staged TimelineEvent (client-side only, not persisted)
 */
function llmEventToTimelineEvent(
  llmEvent: LLMEvent,
  timelineId: string,
  trackId: string
): Partial<TimelineEvent> {
  eventCounter++;
  return {
    id: `staged_${Date.now()}_${eventCounter}_${Math.random().toString(36).slice(2, 9)}`,
    timelineId,
    trackId,
    title: llmEvent.title,
    description: llmEvent.description,
    longDescription: llmEvent.longDescription || '',
    type: llmEvent.type,
    startDate: llmEvent.startDate,
    endDate: llmEvent.endDate,
    datePrecision: llmEvent.datePrecision,
    location: llmEvent.location,
    sources: llmEvent.sources,
    tags: llmEvent.tags,
    status: 'staged',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: timelineId } = await params;

  try {
    // Parse and validate request body
    const body = await request.json();
    const { message, context, bounds, stagingTrackId } = chatRequestSchema.parse(body);

    // Create a TransformStream for SSE
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Helper to send SSE events
    const sendEvent = async (data: unknown) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    };

    // Start streaming response
    const responsePromise = (async () => {
      try {
        // Reset counter for this request
        eventCounter = 0;

        // Check if this is a "learn more" request - just return text, don't generate events
        if (context?.action === 'learn_more') {
          await sendEvent({ type: 'loading', content: 'Getting details...' });

          // Get the focused event from database if we have an ID
          let focusedEvent: Partial<TimelineEvent> | undefined;
          if (context.focusedEventId) {
            const event = await prisma.timelineEvent.findUnique({
              where: { id: context.focusedEventId },
            });
            if (event) {
              focusedEvent = {
                title: event.title,
                description: event.description,
                startDate: event.startDate,
                endDate: event.endDate || undefined,
              };
            }
          }

          const streamGenerator = getEventDetailsStream(message, focusedEvent);

          for await (const chunk of streamGenerator) {
            if (chunk.type === 'text' && chunk.content) {
              await sendEvent({ type: 'text_delta', content: chunk.content });
            } else if (chunk.type === 'done') {
              break;
            }
          }

          await sendEvent({ type: 'done' });
        } else {
          // Default: generate events
          await sendEvent({ type: 'loading', content: 'Generating events...' });

          const streamGenerator = generateEventsStream(message, {
            bounds: bounds as TimelineBounds | undefined,
          });

          const events: Partial<TimelineEvent>[] = [];
          const trackId = stagingTrackId || `staging_${timelineId}`;

          // Process JSONL stream - each event comes in as a complete object
          for await (const chunk of streamGenerator) {
            if (chunk.type === 'event' && chunk.event) {
              const event = llmEventToTimelineEvent(chunk.event, timelineId, trackId);
              events.push(event);

              // Stream this event to the client immediately (client-side only, not persisted yet)
              await sendEvent({
                type: 'event',
                event,
              });
            } else if (chunk.type === 'done') {
              // Streaming complete
              break;
            }
          }

          // Send final summary
          if (events.length > 0) {
            const summaryMessage = `Generated ${events.length} event${events.length === 1 ? '' : 's'}.`;
            await sendEvent({ type: 'text', content: summaryMessage });
            await sendEvent({
              type: 'events',
              events,
              eventIds: events.map((e) => e.id),
            });
          } else {
            await sendEvent({
              type: 'text',
              content:
                "I couldn't generate any events for that request. Try being more specific about the time period or topic.",
            });
          }

          await sendEvent({ type: 'done' });
        }
      } catch (error) {
        console.error('Chat stream error:', error);
        await sendEvent({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        await writer.close();
      }
    })();

    // Don't await the response promise, let it run in the background
    void responsePromise;

    // Return streaming response
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
