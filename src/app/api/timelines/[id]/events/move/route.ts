/**
 * Move Events API Route
 *
 * POST /api/timelines/[id]/events/move
 * Move events to a different track and change their status to confirmed
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { TimelineEvent as PrismaEvent } from '@prisma/client';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: timelineId } = await params;
    const body = await request.json();
    const { eventIds, targetTrackId, events: stagedEvents } = body;

    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return NextResponse.json({ error: 'eventIds must be a non-empty array' }, { status: 400 });
    }

    if (!targetTrackId) {
      return NextResponse.json({ error: 'targetTrackId is required' }, { status: 400 });
    }

    // Verify the target track exists and belongs to this timeline
    const targetTrack = await prisma.track.findFirst({
      where: {
        id: targetTrackId,
        timelineId,
      },
    });

    if (!targetTrack) {
      return NextResponse.json({ error: 'Target track not found' }, { status: 404 });
    }

    // Check which events exist in database
    const existingEvents = await prisma.timelineEvent.findMany({
      where: {
        id: { in: eventIds },
        timelineId,
      },
    });

    const existingEventIds = new Set(existingEvents.map((e) => e.id));
    const updatedEvents: PrismaEvent[] = [];

    // Update existing events
    if (existingEventIds.size > 0) {
      await prisma.timelineEvent.updateMany({
        where: {
          id: { in: Array.from(existingEventIds) },
          timelineId,
        },
        data: {
          trackId: targetTrackId,
          status: 'confirmed',
        },
      });

      const updated = await prisma.timelineEvent.findMany({
        where: {
          id: { in: Array.from(existingEventIds) },
        },
      });
      updatedEvents.push(...updated);
    }

    // Create new events for staged events that don't exist in DB yet
    const stagedEventIds = eventIds.filter((id) => !existingEventIds.has(id));
    if (stagedEventIds.length > 0 && stagedEvents) {
      for (const eventId of stagedEventIds) {
        const stagedEvent = stagedEvents.find((e: { id: string }) => e.id === eventId);
        if (stagedEvent) {
          const createdEvent = await prisma.timelineEvent.create({
            data: {
              timelineId,
              trackId: targetTrackId,
              title: stagedEvent.title,
              description: stagedEvent.description,
              longDescription: stagedEvent.longDescription || '',
              type: stagedEvent.type,
              startDate: stagedEvent.startDate,
              endDate: stagedEvent.endDate,
              datePrecision: stagedEvent.datePrecision,
              location: stagedEvent.location,
              sources: stagedEvent.sources || [],
              tags: stagedEvent.tags || [],
              status: 'confirmed',
            },
          });
          updatedEvents.push(createdEvent);
        }
      }
    }

    return NextResponse.json({ events: updatedEvents });
  } catch (error) {
    console.error('Failed to move events:', error);
    return NextResponse.json({ error: 'Failed to move events' }, { status: 500 });
  }
}
