/**
 * Share Timeline API Route
 *
 * Generate share URL and update visibility settings.
 * Based on Spec.md Section 3.1: API Endpoints
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';

// Share request schema
const shareRequestSchema = z.object({
  visibility: z.enum(['private', 'unlisted', 'public']),
});

/**
 * POST /api/timelines/[id]/share
 * Generate share URL and update visibility
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { visibility } = shareRequestSchema.parse(body);

    // Update timeline visibility
    const timeline = await prisma.timeline.update({
      where: { id },
      data: {
        visibility,
        updatedAt: new Date().toISOString(),
      },
    });

    // Generate share URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/timeline/${timeline.id}`;

    return Response.json({
      shareUrl,
      visibility: timeline.visibility,
    });
  } catch (error) {
    console.error('Share timeline error:', error);

    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    return Response.json({ error: 'Failed to share timeline' }, { status: 500 });
  }
}
