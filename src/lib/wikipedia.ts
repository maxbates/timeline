/**
 * Wikipedia API Client
 *
 * Server-side Wikipedia and Wikidata API integration for the research pipeline.
 * Uses native fetch() with 2-second AbortController timeouts per request.
 */

const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const USER_AGENT = 'TimelineApp/1.0 (https://github.com/maxbates/timeline)';
const REQUEST_TIMEOUT_MS = 2000;

// --- Types ---

export interface WikiSearchResult {
  title: string;
  pageid: number;
  snippet: string;
  wordcount: number;
}

export interface WikiExtract {
  title: string;
  pageid: number;
  extract: string;
  url: string;
  thumbnail?: string;
  description?: string;
}

export interface WikiSource {
  title: string;
  pageid: number;
  extract: string;
  url: string;
  imageUrl?: string;
  thumbnailUrl?: string;
}

// --- Helpers ---

function createAbortSignal(): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return controller.signal;
}

async function wikiApiFetch(baseUrl: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT },
    signal: createAbortSignal(),
  });

  if (!response.ok) {
    throw new Error(`Wikipedia API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// --- Search ---

export async function searchWikipedia(
  query: string,
  limit: number = 10
): Promise<WikiSearchResult[]> {
  const data = (await wikiApiFetch(WIKIPEDIA_API, {
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: String(limit),
    srprop: 'snippet|wordcount',
  })) as { query?: { search?: WikiSearchResult[] } };

  return data.query?.search ?? [];
}

// --- Extracts ---

export async function getWikipediaExtracts(
  titles: string[],
  extractChars: number = 6000
): Promise<WikiExtract[]> {
  if (titles.length === 0) return [];

  // Wikipedia API accepts max 20 titles per request
  const batch = titles.slice(0, 20);

  const data = (await wikiApiFetch(WIKIPEDIA_API, {
    action: 'query',
    prop: 'extracts|pageimages|description',
    titles: batch.join('|'),
    exintro: 'true',
    explaintext: 'true',
    exchars: String(extractChars),
    pithumbsize: '300',
    pilimit: String(batch.length),
  })) as { query?: { pages?: Record<string, WikiPageData> } };

  const pages = data.query?.pages;
  if (!pages) return [];

  return Object.values(pages)
    .filter((page) => page.pageid && page.pageid > 0 && page.extract)
    .map((page) => ({
      title: page.title,
      pageid: page.pageid,
      extract: page.extract,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
      thumbnail: page.thumbnail?.source,
      description: page.description,
    }));
}

interface WikiPageData {
  pageid: number;
  title: string;
  extract: string;
  thumbnail?: { source: string };
  description?: string;
}

// --- Wikidata Image (P18) ---

export async function getWikidataImage(pageid: number): Promise<string | null> {
  try {
    // Step 1: Get Wikidata entity ID from Wikipedia page ID
    const sitelinksData = (await wikiApiFetch(WIKIPEDIA_API, {
      action: 'query',
      prop: 'pageprops',
      ppprop: 'wikibase_item',
      pageids: String(pageid),
    })) as { query?: { pages?: Record<string, { pageprops?: { wikibase_item?: string } }> } };

    const wikibaseItem = sitelinksData.query?.pages?.[String(pageid)]?.pageprops?.wikibase_item;
    if (!wikibaseItem) return null;

    // Step 2: Get P18 (image) claim from Wikidata
    const entityData = (await wikiApiFetch(WIKIDATA_API, {
      action: 'wbgetentities',
      ids: wikibaseItem,
      props: 'claims',
      languages: 'en',
    })) as {
      entities?: Record<
        string,
        { claims?: { P18?: Array<{ mainsnak?: { datavalue?: { value?: string } } }> } }
      >;
    };

    const p18Claims = entityData.entities?.[wikibaseItem]?.claims?.P18;
    const filename = p18Claims?.[0]?.mainsnak?.datavalue?.value;
    if (!filename) return null;

    // Step 3: Resolve filename to actual URL via Special:FilePath
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
  } catch {
    return null;
  }
}

// --- Fallback: Page Image from Wikipedia API ---

export async function getPageImage(title: string): Promise<string | null> {
  try {
    const data = (await wikiApiFetch(WIKIPEDIA_API, {
      action: 'query',
      prop: 'pageimages',
      titles: title,
      pithumbsize: '400',
    })) as { query?: { pages?: Record<string, { thumbnail?: { source: string } }> } };

    const pages = data.query?.pages;
    if (!pages) return null;

    const page = Object.values(pages)[0];
    return page?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}
