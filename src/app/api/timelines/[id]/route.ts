/**
 * Single Timeline API Route
 *
 * Get, update, and delete a specific timeline.
 * Based on Spec.md Section 3.1: API Endpoints
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

// Timeline update schema
const updateTimelineSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
});

/**
 * GET /api/timelines/[id]
 * Get a single timeline with all data
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const timeline = await prisma.timeline.findUnique({
      where: { id },
      include: {
        tracks: {
          orderBy: { order: 'asc' },
        },
        events: {
          orderBy: { startDate: 'asc' },
        },
      },
    });

    if (!timeline) {
      return Response.json({ error: 'Timeline not found' }, { status: 404 });
    }

    return Response.json(timeline);
  } catch (error) {
    console.error('Get timeline error:', error);
    return Response.json({ error: 'Failed to fetch timeline' }, { status: 500 });
  }
}

/**
 * PATCH /api/timelines/[id]
 * Update a timeline
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await request.json();
    const data = updateTimelineSchema.parse(body);

    const timeline = await prisma.timeline.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date().toISOString(),
      },
      include: {
        tracks: true,
        events: true,
      },
    });

    return Response.json(timeline);
  } catch (error) {
    console.error('Update timeline error:', error);

    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    return Response.json({ error: 'Failed to update timeline' }, { status: 500 });
  }
}

/**
 * DELETE /api/timelines/[id]
 * Delete a timeline and all its data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Delete in order: events, tracks, timeline
    await prisma.$transaction([
      prisma.timelineEvent.deleteMany({ where: { timelineId: id } }),
      prisma.track.deleteMany({ where: { timelineId: id } }),
      prisma.timeline.delete({ where: { id } }),
    ]);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Delete timeline error:', error);
    return Response.json({ error: 'Failed to delete timeline' }, { status: 500 });
  }
}
