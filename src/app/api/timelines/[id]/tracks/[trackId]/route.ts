/**
 * Single Track API Route
 *
 * PATCH /api/timelines/[id]/tracks/[trackId] - Update track
 * DELETE /api/timelines/[id]/tracks/[trackId] - Delete track
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; trackId: string }> }
) {
  try {
    const { id: timelineId, trackId } = await params;
    const body = await request.json();
    const { name, color, visible } = body;

    // Update the track
    const track = await prisma.track.update({
      where: {
        id: trackId,
        timelineId, // Ensure track belongs to this timeline
      },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(visible !== undefined && { visible }),
      },
    });

    return NextResponse.json(track);
  } catch (error) {
    console.error('Failed to update track:', error);
    return NextResponse.json({ error: 'Failed to update track' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; trackId: string }> }
) {
  try {
    const { id: timelineId, trackId } = await params;

    // Delete the track (this will cascade delete events on this track)
    await prisma.track.delete({
      where: {
        id: trackId,
        timelineId, // Ensure track belongs to this timeline
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete track:', error);
    return NextResponse.json({ error: 'Failed to delete track' }, { status: 500 });
  }
}
