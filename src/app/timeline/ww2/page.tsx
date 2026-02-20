/**
 * World War II Timeline Page
 *
 * Seeded timeline with key events from WW2
 */

import { seedWW2Timeline } from '@/lib/seeds/ww2';
import { TimelineViewerClient } from '../[id]/client';

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

export default async function WW2TimelinePage() {
  // Seed or load the WW2 timeline
  const timeline = await seedWW2Timeline();

  if (!timeline) {
    throw new Error('Failed to load WW2 timeline');
  }

  // Transform Prisma data to match our types
  const timelineData = {
    ...timeline,
    description: timeline.description ?? '',
    visibility: timeline.visibility as 'private' | 'unlisted' | 'public',
    createdAt: timeline.createdAt.toString(),
    updatedAt: timeline.updatedAt.toString(),
    ownerId: timeline.ownerId ?? '',
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
