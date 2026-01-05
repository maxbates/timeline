/**
 * Timelines API Route
 *
 * List and create timelines.
 * Based on Spec.md Section 3.1: API Endpoints
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

// Timeline creation schema
const createTimelineSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  visibility: z.enum(['private', 'unlisted', 'public']).optional().default('private'),
});

/**
 * GET /api/timelines
 * List all timelines (for current user in future)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const visibility = searchParams.get('visibility');

    const where: Record<string, unknown> = {};
    if (visibility) {
      where.visibility = visibility;
    }

    const timelines = await prisma.timeline.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        tracks: true,
        _count: {
          select: { events: true },
        },
      },
    });

    return Response.json(timelines);
  } catch (error) {
    console.error('List timelines error:', error);
    return Response.json({ error: 'Failed to fetch timelines' }, { status: 500 });
  }
}

/**
 * POST /api/timelines
 * Create a new timeline
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createTimelineSchema.parse(body);

    // Create timeline with default tracks
    const timeline = await prisma.timeline.create({
      data: {
        title: data.title,
        description: data.description,
        // ownerId omitted until auth is implemented
        visibility: data.visibility,
        tracks: {
          create: [
            {
              name: 'Main',
              type: 'main',
              color: 'blue',
              order: 0,
              visible: true,
            },
            {
              name: 'Staged',
              type: 'staging',
              color: 'green',
              order: 1,
              visible: true,
            },
          ],
        },
      },
      include: {
        tracks: true,
        events: true,
      },
    });

    return Response.json(timeline, { status: 201 });
  } catch (error) {
    console.error('Create timeline error:', error);

    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    return Response.json({ error: 'Failed to create timeline' }, { status: 500 });
  }
}
