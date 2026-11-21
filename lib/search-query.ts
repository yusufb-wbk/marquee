const MIN_LENGTH = 2;
const MAX_LENGTH = 80;

/** Collapse whitespace so near-duplicate searches share one TMDB call. */
export function normalizeSearchQuery(value: string): string | null {
  const query = value.trim().replace(/\s+/g, " ");
  if (query.length < MIN_LENGTH || query.length > MAX_LENGTH) {
    return null;
  }
  return query;
}

export const SEARCH_QUERY_MAX = MAX_LENGTH;
