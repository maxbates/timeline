/**
 * Event Details API Route
 *
 * Handles streaming LLM responses for learning more about an event.
 * Based on Spec.md Section 3.3: LLM Integration
 */

import { NextRequest } from 'next/server';
import { getEventDetailsStream } from '@/lib/llm';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { id: timelineId, eventId } = await params;

  try {
    // Get the event from database
    const event = await prisma.timelineEvent.findUnique({
      where: { id: eventId, timelineId },
    });

    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

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
        // Generate message asking for more details about the event
        const message = `Tell me more about "${event.title}". Provide additional details and context in a couple of paragraphs.`;

        const focusedEvent = {
          title: event.title,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate || undefined,
        };

        const streamGenerator = getEventDetailsStream(message, focusedEvent);

        for await (const chunk of streamGenerator) {
          if (chunk.type === 'text' && chunk.content) {
            await sendEvent({ type: 'text_delta', content: chunk.content });
          } else if (chunk.type === 'done') {
            await sendEvent({ type: 'done' });
            break;
          }
        }
      } catch (error) {
        console.error('Event details stream error:', error);
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
    console.error('Event details API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
