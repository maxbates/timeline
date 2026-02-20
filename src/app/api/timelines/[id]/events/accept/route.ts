/**
 * Accept Staged Events API Route
 *
 * Accepts staged events and moves them to confirmed status.
 * Based on Spec.md Section 2.5: Staged Events
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

// Request schema
const acceptEventsSchema = z.object({
  eventIds: z.array(z.string()).min(1),
  targetTrackId: z.string().optional(), // Optional: move to a specific track
});

/**
 * POST /api/timelines/[id]/events/accept
 * Accept staged events (mark as confirmed)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: timelineId } = await params;

  try {
    const body = await request.json();
    const { eventIds, targetTrackId } = acceptEventsSchema.parse(body);

    // Verify timeline exists
    const timeline = await prisma.timeline.findUnique({
      where: { id: timelineId },
      include: { tracks: true },
    });

    if (!timeline) {
      return Response.json({ error: 'Timeline not found' }, { status: 404 });
    }

    // Find main track if no target specified
    const mainTrack = timeline.tracks.find((t: { type: string }) => t.type === 'main');
    const targetTrack = targetTrackId || mainTrack?.id;

    if (!targetTrack) {
      return Response.json({ error: 'No target track available' }, { status: 400 });
    }

    // Update events to confirmed status
    const result = await prisma.timelineEvent.updateMany({
      where: {
        id: { in: eventIds },
        timelineId,
        status: 'staged',
      },
      data: {
        status: 'confirmed',
        trackId: targetTrack,
        updatedAt: new Date().toISOString(),
      },
    });

    // Get updated events
    const acceptedEvents = await prisma.timelineEvent.findMany({
      where: {
        id: { in: eventIds },
        timelineId,
      },
    });

    return Response.json({
      accepted: result.count,
      events: acceptedEvents,
    });
  } catch (error) {
    console.error('Accept events error:', error);

    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    return Response.json({ error: 'Failed to accept events' }, { status: 500 });
  }
}
