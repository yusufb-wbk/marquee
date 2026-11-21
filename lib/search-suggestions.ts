import type { MediaType, SearchTitle } from "@/lib/tmdb/types";

export type SearchSuggestion = {
  id: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
};

export function suggestionHref(title: SearchSuggestion): string {
  return title.mediaType === "tv" ? `/tv/${title.id}` : `/movie/${title.id}`;
}

export function toSuggestions(
  titles: readonly SearchTitle[],
  limit = 8,
): SearchSuggestion[] {
  return titles.slice(0, limit).map((title) => ({
    id: title.id,
    mediaType: title.mediaType,
    title: title.title,
    year: title.year,
  }));
}

export function parseSuggestions(body: unknown): SearchSuggestion[] {
  if (typeof body !== "object" || body === null || !("titles" in body)) {
    return [];
  }
  const titles = body.titles;
  if (!Array.isArray(titles)) {
    return [];
  }

  const suggestions: SearchSuggestion[] = [];
  for (const item of titles) {
    const suggestion = readSuggestion(item);
    if (!suggestion) {
      continue;
    }
    suggestions.push(suggestion);
    if (suggestions.length === 8) {
      break;
    }
  }
  return suggestions;
}

function readSuggestion(value: unknown): SearchSuggestion | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  if (
    !("id" in value) ||
    !("mediaType" in value) ||
    !("title" in value) ||
    !("year" in value)
  ) {
    return null;
  }

  const id = value.id;
  const mediaType = value.mediaType;
  const title = value.title;
  const year = value.year;
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
    return null;
  }
  if (mediaType !== "movie" && mediaType !== "tv") {
    return null;
  }
  if (typeof title !== "string" || title.trim().length === 0) {
    return null;
  }
  const parsedYear =
    typeof year === "string" && /^\d{4}$/.test(year) ? year : null;
  return { id, mediaType, title, year: parsedYear };
}
