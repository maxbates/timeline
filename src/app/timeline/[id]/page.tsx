/**
 * Timeline Viewer Page
 *
 * Main page for viewing and interacting with a timeline.
 * Based on Spec.md Section 2: UI Architecture
 */

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { TimelineViewerClient } from './client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TimelinePage({ params }: PageProps) {
  const { id } = await params;

  // Fetch timeline data
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
    notFound();
  }

  // Transform Prisma data to match our types
  const timelineData = {
    ...timeline,
    description: timeline.description ?? '',
    visibility: timeline.visibility as 'private' | 'unlisted' | 'public',
    createdAt: timeline.createdAt.toString(),
    updatedAt: timeline.updatedAt.toString(),
    tracks: timeline.tracks.map((track) => ({
      ...track,
      type: track.type as 'main' | 'staging' | 'custom',
      color: track.color as
        | 'blue'
        | 'green'
        | 'red'
        | 'orange'
        | 'purple'
        | 'pink'
        | 'teal'
        | 'gray',
      metadata: track.metadata as Record<string, unknown> | undefined,
    })),
    events: timeline.events.map((event) => ({
      ...event,
      type: event.type as 'point' | 'span',
      endDate: event.endDate ?? undefined,
      datePrecision: event.datePrecision as 'year' | 'month' | 'day' | 'datetime',
      status: event.status as 'confirmed' | 'staged',
      createdAt: event.createdAt.toString(),
      updatedAt: event.updatedAt.toString(),
      location: event.location as
        | {
            name: string;
            latitude?: number;
            longitude?: number;
            placeId?: string;
          }
        | undefined,
      sources:
        (event.sources as Array<{
          title: string;
          url: string;
          type: 'wikipedia' | 'article' | 'book' | 'other';
          accessedAt?: string;
        }>) || [],
      metadata: event.metadata as Record<string, unknown> | undefined,
    })),
    metadata: timeline.metadata as Record<string, unknown> | undefined,
  };

  return <TimelineViewerClient timeline={timelineData} />;
}
