/**
 * Wikipedia Cache Layer
 *
 * Caches Wikipedia API responses in Neon PostgreSQL via Prisma.
 * 24-hour TTL with probabilistic cleanup (~10% of reads).
 * Falls through to direct fetch on DB errors (cache is a perf optimization, not a gate).
 */

import { prisma } from '@/lib/db';

/**
 * Get a cached value or fetch it, storing the result for future reads.
 * Cache keys are normalized (lowercased, trimmed) for consistency.
 */
export async function getCachedOrFetch<T>(
  cacheKey: string,
  cacheType: string,
  fetchFn: () => Promise<T>,
  ttlHours: number = 24
): Promise<T> {
  const normalizedKey = cacheKey.toLowerCase().trim();

  try {
    // Try cache hit
    const cached = await prisma.wikipediaCache.findUnique({
      where: { cacheKey: normalizedKey },
    });

    if (cached && cached.expiresAt > new Date()) {
      // Probabilistic cleanup (~10% of reads)
      if (Math.random() < 0.1) {
        void invalidateExpiredCache().catch(() => {});
      }
      return cached.data as T;
    }

    // Cache miss or expired — fetch fresh data
    const data = await fetchFn();

    // Store in cache using upsert to handle concurrent miss races
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    await prisma.wikipediaCache
      .upsert({
        where: { cacheKey: normalizedKey },
        update: { data: data as object, cacheType, expiresAt },
        create: {
          cacheKey: normalizedKey,
          cacheType,
          data: data as object,
          expiresAt,
        },
      })
      .catch(() => {
        // Non-critical: if cache write fails, we still have the data
      });

    return data;
  } catch {
    // DB failure — fall through to direct fetch
    return fetchFn();
  }
}

/**
 * Delete expired cache entries.
 */
export async function invalidateExpiredCache(): Promise<number> {
  const result = await prisma.wikipediaCache.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
