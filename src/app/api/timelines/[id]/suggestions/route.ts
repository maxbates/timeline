/**
 * Timeline Suggestions API Route
 *
 * Generates suggested prompts for the timeline based on its title and description.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: timelineId } = await params;

  // Extract API key from header
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    return Response.json(
      { error: 'No API key provided. Set your Anthropic API key in Settings.' },
      { status: 401 }
    );
  }

  try {
    // Get the timeline
    const timeline = await prisma.timeline.findUnique({
      where: { id: timelineId },
    });

    if (!timeline) {
      return Response.json({ error: 'Timeline not found' }, { status: 404 });
    }

    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are a helpful assistant that generates engaging prompts for timeline event generation.
Given a timeline title and description, generate exactly 5 diverse, specific prompts that would help populate the timeline with interesting events.

Each prompt should:
- Be specific and actionable
- Focus on different aspects or time periods
- Be 8-15 words long
- Encourage generation of multiple related events

Return ONLY a JSON array of 5 strings, nothing else. No markdown, no explanation.`;

    const userPrompt = `Timeline: ${timeline.title}
Description: ${timeline.description || 'No description provided'}

Generate 5 diverse prompts for this timeline.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Parse the response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    let suggestions: string[];
    try {
      suggestions = JSON.parse(content.text);

      if (!Array.isArray(suggestions) || suggestions.length !== 5) {
        throw new Error('Invalid suggestions format');
      }
    } catch {
      console.error('Failed to parse suggestions:', content.text);
      throw new Error('Failed to parse suggestions');
    }

    return Response.json({ suggestions });
  } catch (error) {
    console.error('Suggestions API error:', error);
    return Response.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}
