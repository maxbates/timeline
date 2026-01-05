/**
 * Tracks API Route
 *
 * POST /api/timelines/[id]/tracks - Create a new track
 * GET /api/timelines/[id]/tracks - List all tracks
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: timelineId } = await params;
    const body = await request.json();
    const { name, type, color, order } = body;

    // Create the track
    const track = await prisma.track.create({
      data: {
        timelineId,
        name: name || 'New Track',
        type: type || 'custom',
        color: color || 'purple',
        order: order ?? 0,
        visible: true,
      },
    });

    return NextResponse.json(track);
  } catch (error) {
    console.error('Failed to create track:', error);
    return NextResponse.json({ error: 'Failed to create track' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: timelineId } = await params;

    const tracks = await prisma.track.findMany({
      where: { timelineId },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('Failed to fetch tracks:', error);
    return NextResponse.json({ error: 'Failed to fetch tracks' }, { status: 500 });
  }
}
