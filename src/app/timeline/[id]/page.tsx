/**
 * Timeline Viewer Page
 *
 * Main page for viewing and interacting with a timeline.
 * Based on Spec.md Section 2: UI Architecture
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { TimelineViewerClient } from './client';

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  const timeline = await prisma.timeline.findUnique({
    where: { id },
    select: { title: true, description: true },
  });

  if (!timeline) {
    return {
      title: 'Timeline Not Found',
    };
  }

  return {
    title: `${timeline.title} | Timeline`,
    description: timeline.description || undefined,
  };
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
    // Filter out any persisted staging tracks - they should only exist client-side
    tracks: timeline.tracks
      .filter((track) => track.type !== 'staging')
      .map((track) => ({
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
    // Filter out any staged events - they should only exist client-side
    events: timeline.events
      .filter((event) => event.status !== 'staged')
      .map((event) => ({
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
