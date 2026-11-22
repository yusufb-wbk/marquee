import "server-only";

import { cacheLife } from "next/cache";

import { readEnv } from "@/lib/env";
import { parseMdblist, type MdblistResult } from "@/lib/ratings";

/**
 * Scores from IMDb, Rotten Tomatoes, Metacritic, Letterboxd and Trakt, through MDBList.
 * Returns null when MDBLIST_API_KEY is not set, so pages can fall back to TMDB's score.
 * Cached for days: scores move slowly, and the free key allows about 1,000 requests a day.
 */
export async function getExternalRatings(
  kind: "movie" | "tv",
  tmdbId: number,
): Promise<MdblistResult | null> {
  if (!readEnv("MDBLIST_API_KEY")) {
    return null;
  }
  try {
    return await fetchRatingsCached(kind, tmdbId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("MDBList ratings failed:", message);
    return { score: null, ratings: [] };
  }
}

async function fetchRatingsCached(kind: "movie" | "tv", tmdbId: number): Promise<MdblistResult> {
  "use cache: remote";
  cacheLife("days");

  const key = readEnv("MDBLIST_API_KEY");
  if (!key) {
    return { score: null, ratings: [] };
  }
  const url = new URL(`https://api.mdblist.com/tmdb/${kind === "tv" ? "show" : "movie"}/${tmdbId}`);
  url.searchParams.set("apikey", key);
  let response = await fetchOnce(url);
  if (response.status === 503 || response.status === 429) {
    // MDBList turns away bursts; one short wait is usually enough.
    await new Promise((resolve) => setTimeout(resolve, 800));
    response = await fetchOnce(url);
  }
  if (response.status === 404) {
    return { score: null, ratings: [] };
  }
  if (!response.ok) {
    // Thrown, not returned, so a failure is not cached for days.
    throw new Error(`MDBList answered ${response.status}`);
  }
  return parseMdblist(await response.json(), kind);
}

function fetchOnce(url: URL): Promise<Response> {
  return fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
}
