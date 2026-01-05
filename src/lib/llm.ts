/**
 * LLM Integration Module
 *
 * Claude API client for generating timeline events.
 * Based on Spec.md Section 3.3: LLM Integration
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { TimelineEvent, TimelineBounds } from '@/types';

// Event schema for LLM output parsing
const llmEventSchema = z.object({
  title: z.string().max(60),
  description: z.string().max(200),
  longDescription: z.string().max(1000).optional().default(''),
  type: z.enum(['point', 'span']),
  startDate: z.string(),
  endDate: z.string().optional(),
  datePrecision: z.enum(['year', 'month', 'day', 'datetime']),
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
        url: z.string().url(),
        type: z.enum(['wikipedia', 'article', 'book', 'other']),
      })
    )
    .default([]),
  tags: z.array(z.string()).optional(),
});

const llmResponseSchema = z.object({
  events: z.array(llmEventSchema),
  explanation: z.string().optional(),
});

export type LLMEvent = z.infer<typeof llmEventSchema>;
export type LLMResponse = z.infer<typeof llmResponseSchema>;

/**
 * Initialize Anthropic client
 */
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  return new Anthropic({ apiKey });
}

/**
 * System prompt for timeline event generation
 */
const SYSTEM_PROMPT = `You are a timeline event generator. Your task is to generate historical or topical events for a timeline visualization application.

When generating events, follow these guidelines:

1. **Date Format**: Use Extended ISO 8601 format:
   - CE dates: "2024-03-15" (standard ISO 8601)
   - BCE dates: "-0753-04-21" (negative year for BCE)
   - Year-only: "2024" or "-0500"

2. **Event Types**:
   - "point": Single date events (e.g., "Battle of Hastings")
   - "span": Date range events (e.g., "World War II")

3. **Content Guidelines**:
   - title: Max 10 words (~60 chars), concise and descriptive
   - description: 1 sentence (~200 chars), summarizes the event
   - longDescription: 1-2 paragraphs (~1000 chars), provides context and details

4. **Sources**: Always include at least one source per event, preferring Wikipedia for historical events.

5. **Accuracy**: Ensure dates and facts are historically accurate. When uncertain, indicate approximate dates using year precision.

6. **Response Format**: Use JSONL (JSON Lines) format - one complete event JSON object per line, no wrapping array or object. Each line must be a complete, valid JSON object.`;

/**
 * Build user prompt for event generation
 */
function buildUserPrompt(
  query: string,
  bounds?: TimelineBounds,
  focusedEvent?: Partial<TimelineEvent>
): string {
  let prompt = `Generate timeline events based on the following request:\n\n"${query}"`;

  if (bounds) {
    prompt += `\n\nThe timeline currently spans from ${bounds.viewStart} to ${bounds.viewEnd}.`;
  }

  if (focusedEvent) {
    prompt += `\n\nContext: The user is viewing an event titled "${focusedEvent.title}" (${focusedEvent.startDate}).`;
    prompt += `\nGenerate related events that would complement this one.`;
  }

  prompt += `\n\nRespond in JSONL format (one event per line). Each line should be a complete JSON object like this:

{"title": "Event Title", "description": "One sentence description.", "longDescription": "Longer description...", "type": "point", "startDate": "YYYY-MM-DD", "datePrecision": "year", "location": {"name": "Location"}, "sources": [{"title": "Source", "url": "https://...", "type": "wikipedia"}], "tags": ["tag1"]}
{"title": "Another Event", "description": "Another description.", "longDescription": "More context...", "type": "span", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "datePrecision": "year", "sources": [{"title": "Source", "url": "https://...", "type": "article"}], "tags": ["tag2"]}

Do not wrap the events in an array or object. Output one event JSON per line only.`;

  return prompt;
}

/**
 * Parse LLM response and extract events
 */
function parseResponse(content: string): LLMResponse {
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = content;

  // Try to find JSON in code block
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Try to find JSON object directly
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return llmResponseSchema.parse(parsed);
  } catch (error) {
    console.error('Failed to parse LLM response:', error);
    throw new Error('Failed to parse event generation response');
  }
}

/**
 * Generate timeline events using Claude API
 */
export async function generateEvents(
  query: string,
  options?: {
    bounds?: TimelineBounds;
    focusedEvent?: Partial<TimelineEvent>;
    maxEvents?: number;
  }
): Promise<LLMResponse> {
  const client = getClient();

  const userPrompt = buildUserPrompt(query, options?.bounds, options?.focusedEvent);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  // Extract text content
  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in response');
  }

  return parseResponse(textContent.text);
}

/**
 * Generate events with streaming response
 * Returns an async generator for streaming chunks
 */
export async function* generateEventsStream(
  query: string,
  options?: {
    bounds?: TimelineBounds;
    focusedEvent?: Partial<TimelineEvent>;
    maxEvents?: number;
  }
): AsyncGenerator<{ type: 'event' | 'done'; event?: LLMEvent }> {
  const client = getClient();

  const userPrompt = buildUserPrompt(query, options?.bounds, options?.focusedEvent);

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  let buffer = '';
  const parsedEvents: LLMEvent[] = [];

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      buffer += event.delta.text;

      // Try to parse complete lines (JSONL format)
      const lines = buffer.split('\n');
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed);
          const validated = llmEventSchema.parse(parsed);
          parsedEvents.push(validated);
          yield { type: 'event', event: validated };
        } catch (error) {
          // Skip invalid lines
          console.warn('Failed to parse JSONL line:', trimmed, error);
        }
      }
    }
  }

  // Try to parse any remaining buffer content
  if (buffer.trim()) {
    try {
      const parsed = JSON.parse(buffer.trim());
      const validated = llmEventSchema.parse(parsed);
      parsedEvents.push(validated);
      yield { type: 'event', event: validated };
    } catch {
      // Ignore final parse errors
    }
  }

  yield { type: 'done' };
}

/**
 * Learn more about a specific event (generates additional context events)
 */
export async function learnMore(event: TimelineEvent): Promise<LLMResponse> {
  const query = `Tell me more about "${event.title}" (${event.startDate}). Generate additional related events that provide historical context.`;

  return generateEvents(query, {
    focusedEvent: event,
    maxEvents: 5,
  });
}

/**
 * Get detailed information about a specific event (text only, no new events)
 * Returns streaming text with additional details and context
 */
export async function* getEventDetailsStream(
  message: string,
  event?: Partial<TimelineEvent>
): AsyncGenerator<{ type: 'text' | 'done'; content?: string }> {
  const client = getClient();

  const systemPrompt = `You are a knowledgeable historian providing detailed information about historical events.
When asked about an event, provide 2-3 paragraphs of additional context, significance, and interesting details.
DO NOT generate JSON. DO NOT suggest new events. Just provide informative prose.`;

  const userPrompt = event
    ? `Event: ${event.title}\nDate: ${event.startDate}\nDescription: ${event.description}\n\nUser question: ${message}`
    : message;

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      yield { type: 'text', content: chunk.delta.text };
    }
  }

  yield { type: 'done' };
}

/**
 * Find similar events
 */
export async function findSimilarEvents(
  event: TimelineEvent,
  bounds?: TimelineBounds
): Promise<LLMResponse> {
  const query = `Find events similar to "${event.title}" in terms of theme, impact, or historical significance.`;

  return generateEvents(query, {
    bounds,
    focusedEvent: event,
    maxEvents: 5,
  });
}
