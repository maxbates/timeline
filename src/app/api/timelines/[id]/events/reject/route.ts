/**
 * Reject Staged Events API Route
 *
 * Rejects staged events by deleting them.
 * Based on Spec.md Section 2.5: Staged Events
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

// Request schema
const rejectEventsSchema = z.object({
  eventIds: z.array(z.string()).min(1),
});

/**
 * POST /api/timelines/[id]/events/reject
 * Reject staged events (delete them)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: timelineId } = await params;

  try {
    const body = await request.json();
    const { eventIds } = rejectEventsSchema.parse(body);

    // Delete staged events
    const result = await prisma.timelineEvent.deleteMany({
      where: {
        id: { in: eventIds },
        timelineId,
        status: 'staged',
      },
    });

    return Response.json({
      rejected: result.count,
    });
  } catch (error) {
    console.error('Reject events error:', error);

    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    return Response.json({ error: 'Failed to reject events' }, { status: 500 });
  }
}
