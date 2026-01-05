/**
 * Events API Route
 *
 * CRUD operations for timeline events.
 * Based on Spec.md Section 3.1: API Endpoints
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

// Event creation schema
const createEventSchema = z.object({
  title: z.string().min(1).max(60),
  description: z.string().max(200),
  longDescription: z.string().max(1000).optional().default(''),
  type: z.enum(['point', 'span']),
  startDate: z.string(),
  endDate: z.string().optional(),
  datePrecision: z.enum(['day', 'month', 'year', 'decade', 'century', 'millennium']),
  trackId: z.string(),
  location: z
    .object({
      name: z.string(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      placeId: z.string().optional(),
    })
    .optional(),
  sources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().url(),
        type: z.enum(['wikipedia', 'article', 'book', 'manual', 'other']).optional(),
        accessedAt: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  tags: z.array(z.string()).optional(),
  status: z.enum(['confirmed', 'staged']).optional().default('confirmed'),
});

/**
 * GET /api/timelines/[id]/events
 * Get all events for a timeline
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: timelineId } = await params;

  try {
    const events = await prisma.timelineEvent.findMany({
      where: { timelineId },
      orderBy: { startDate: 'asc' },
    });

    return Response.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    return Response.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

/**
 * POST /api/timelines/[id]/events
 * Create a new event
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: timelineId } = await params;

  try {
    const body = await request.json();
    const data = createEventSchema.parse(body);

    // Verify timeline exists
    const timeline = await prisma.timeline.findUnique({
      where: { id: timelineId },
    });

    if (!timeline) {
      return Response.json({ error: 'Timeline not found' }, { status: 404 });
    }

    // Create event
    const event = await prisma.timelineEvent.create({
      data: {
        timelineId,
        trackId: data.trackId,
        title: data.title,
        description: data.description,
        longDescription: data.longDescription,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        datePrecision: data.datePrecision,
        location: data.location,
        sources: data.sources,
        tags: data.tags || [],
        status: data.status,
      },
    });

    return Response.json(event, { status: 201 });
  } catch (error) {
    console.error('Create event error:', error);

    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    return Response.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
