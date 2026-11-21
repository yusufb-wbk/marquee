export type RateWindow = {
  limit: number;
  windowMs: number;
};

type Hit = {
  at: number;
};

const buckets = new Map<string, Hit[]>();

/** Sliding window. Returns false once `limit` hits have landed inside `windowMs`. */
export function consumeRateLimit(
  key: string,
  window: RateWindow,
  now = Date.now(),
): boolean {
  const hits = buckets.get(key) ?? [];
  const fresh = hits.filter((hit) => now - hit.at < window.windowMs);
  if (fresh.length >= window.limit) {
    buckets.set(key, fresh);
    prune(now);
    return false;
  }
  fresh.push({ at: now });
  buckets.set(key, fresh);
  prune(now);
  return true;
}

export function resetRateLimits(): void {
  buckets.clear();
}

function prune(now: number): void {
  if (buckets.size < 2000) {
    return;
  }
  for (const [key, hits] of buckets) {
    const latest = hits.at(-1);
    if (!latest || now - latest.at >= 60 * 60 * 1000) {
      buckets.delete(key);
    }
  }
}
