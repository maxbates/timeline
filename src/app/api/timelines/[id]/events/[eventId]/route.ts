/**
 * Single Event API Route
 *
 * Handles operations on individual events.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { geocodeLocation } from '@/lib/geocoding';

// Request validation schema for updates
const updateEventSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  longDescription: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  datePrecision: z.enum(['day', 'month', 'year', 'decade', 'century']).optional(),
  type: z.enum(['point', 'span']).optional(),
  location: z
    .object({
      name: z.string(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    })
    .optional(),
  sources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string(),
        type: z.enum(['wikipedia', 'academic', 'news', 'primary', 'other']),
      })
    )
    .optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['staged', 'confirmed']).optional(),
});

/**
 * PATCH /api/timelines/[id]/events/[eventId]
 * Update a single event
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { id: timelineId, eventId } = await params;

  try {
    const body = await request.json();
    const updates = updateEventSchema.parse(body);

    // Find the event
    const event = await prisma.timelineEvent.findFirst({
      where: {
        id: eventId,
        timelineId,
      },
    });

    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Geocode location if it's being updated and has a name but no coordinates
    if (updates.location && !updates.location.latitude && !updates.location.longitude) {
      console.log('Geocoding location:', updates.location.name);
      const geocoded = await geocodeLocation(updates.location.name);
      if (geocoded) {
        updates.location = {
          ...updates.location,
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
        };
        console.log('Geocoded successfully:', updates.location);
      } else {
        console.warn('Failed to geocode location:', updates.location.name);
      }
    }

    // Update the event
    const updatedEvent = await prisma.timelineEvent.update({
      where: { id: eventId },
      data: updates,
    });

    return Response.json(updatedEvent);
  } catch (error) {
    console.error('Update event error:', error);

    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    return Response.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

/**
 * DELETE /api/timelines/[id]/events/[eventId]
 * Delete a single event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { id: timelineId, eventId } = await params;

  try {
    // Verify the event belongs to this timeline
    const event = await prisma.timelineEvent.findFirst({
      where: {
        id: eventId,
        timelineId,
      },
    });

    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Delete the event
    await prisma.timelineEvent.delete({
      where: { id: eventId },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    return Response.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
