/**
 * Research Orchestrator
 *
 * Gathers Wikipedia sources, builds augmented LLM prompts with source material,
 * validates citations, and enriches events with images.
 */

import {
  searchWikipedia,
  getWikipediaExtracts,
  getWikidataImage,
  getPageImage,
} from '@/lib/wikipedia';
import { getCachedOrFetch } from '@/lib/wikipedia-cache';
import type { LLMEvent } from '@/lib/llm';

// --- Types ---

export interface ResearchSource {
  title: string;
  url: string;
  extract: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  pageid: number;
}

export interface ResearchContext {
  query: string;
  sources: ResearchSource[];
  totalTokensUsed: number;
}

// --- XML Escaping ---

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Token estimation (~4 chars per token) ---

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// --- Source Gathering ---

export async function gatherSources(
  query: string,
  options: { maxSources?: number; tokenBudget?: number } = {}
): Promise<ResearchContext> {
  const { maxSources = 8, tokenBudget = 8000 } = options;

  // Step 1: Search Wikipedia (cached)
  const searchResults = await getCachedOrFetch(`search:${query}`, 'search', () =>
    searchWikipedia(query, 12)
  );

  if (searchResults.length === 0) {
    return { query, sources: [], totalTokensUsed: 0 };
  }

  // Step 2: Get extracts for top results (cached)
  const titles = searchResults.slice(0, maxSources).map((r) => r.title);
  const extracts = await getCachedOrFetch(`extracts:${titles.join('|')}`, 'extract', () =>
    getWikipediaExtracts(titles)
  );

  // Step 3: Get images in parallel (cached, with fallback chain)
  const sourcesWithImages = await Promise.all(
    extracts.map(async (extract): Promise<ResearchSource> => {
      let imageUrl: string | null = null;
      let thumbnailUrl: string | undefined = extract.thumbnail;

      try {
        // Try Wikidata P18 first (cached)
        imageUrl = await getCachedOrFetch(`image:wikidata:${extract.pageid}`, 'image', () =>
          getWikidataImage(extract.pageid)
        );

        // Fallback to pageimages if P18 missing
        if (!imageUrl && !thumbnailUrl) {
          thumbnailUrl =
            (await getCachedOrFetch(`image:page:${extract.title}`, 'image', () =>
              getPageImage(extract.title)
            )) ?? undefined;
        }
      } catch {
        // Image lookup failed — continue without image
      }

      return {
        title: extract.title,
        url: extract.url,
        extract: extract.extract,
        imageUrl: imageUrl ?? undefined,
        thumbnailUrl,
        pageid: extract.pageid,
      };
    })
  );

  // Step 4: Trim extracts to fit token budget
  let totalTokens = 0;
  const trimmedSources: ResearchSource[] = [];

  for (const source of sourcesWithImages) {
    const extractTokens = estimateTokens(source.extract);
    if (totalTokens + extractTokens > tokenBudget && trimmedSources.length > 0) {
      // Try to fit a truncated version
      const remainingBudget = tokenBudget - totalTokens;
      if (remainingBudget > 200) {
        const truncatedChars = remainingBudget * 4;
        trimmedSources.push({
          ...source,
          extract: source.extract.slice(0, truncatedChars) + '...',
        });
        totalTokens += remainingBudget;
      }
      break;
    }
    trimmedSources.push(source);
    totalTokens += extractTokens;
  }

  return {
    query,
    sources: trimmedSources,
    totalTokensUsed: totalTokens,
  };
}

// --- Prompt Building ---

export function buildResearchPrompt(baseSystemPrompt: string, sources: ResearchSource[]): string {
  if (sources.length === 0) return baseSystemPrompt;

  const sourcesXml = sources
    .map(
      (s, i) =>
        `  <source id="${i + 1}" title="${escapeXml(s.title)}" url="${escapeXml(s.url)}">\n    ${escapeXml(s.extract)}\n  </source>`
    )
    .join('\n');

  return `${baseSystemPrompt}

You are now in RESEARCH MODE. You have been provided with real source material from Wikipedia. Use these sources to ground your events in verified facts.

<sources>
${sourcesXml}
</sources>

IMPORTANT: Only cite URLs that appear in the <sources> block above. Do NOT invent or hallucinate source URLs.

For each event, include 2-3 "digDeeperSuggestions" — interesting follow-up questions a curious person would ask about this event. Frame them as questions, not topics.
Example: ["What caused the East to survive but not the West?", "How did this affect trade routes?"]`;
}

// --- Citation Validation ---

export function validateCitations(event: LLMEvent, allowedSources: ResearchSource[]): LLMEvent {
  if (!event.sources || event.sources.length === 0) return event;

  const allowedUrls = new Set(allowedSources.map((s) => s.url));

  const validSources = event.sources.filter((s) => allowedUrls.has(s.url));

  return { ...event, sources: validSources };
}

// --- Image Enrichment ---

export function enrichEventWithImage(
  event: LLMEvent,
  sources: ResearchSource[]
): LLMEvent & { metadata?: { imageUrl?: string; thumbnailUrl?: string } } {
  // Try to match event sources to research sources with images
  for (const eventSource of event.sources ?? []) {
    const matched = sources.find((s) => s.url === eventSource.url);
    if (matched && (matched.imageUrl || matched.thumbnailUrl)) {
      return {
        ...event,
        metadata: {
          imageUrl: matched.imageUrl,
          thumbnailUrl: matched.thumbnailUrl,
        },
      };
    }
  }

  // Fallback: use the first source with an image
  const sourceWithImage = sources.find((s) => s.imageUrl || s.thumbnailUrl);
  if (sourceWithImage) {
    return {
      ...event,
      metadata: {
        imageUrl: sourceWithImage.imageUrl,
        thumbnailUrl: sourceWithImage.thumbnailUrl,
      },
    };
  }

  return event;
}
