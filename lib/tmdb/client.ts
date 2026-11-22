import "server-only";

import { cacheLife } from "next/cache";
import { connection } from "next/server";

import { readEnv } from "@/lib/env";
import { consumeRateLimit, remainingRateLimit } from "@/lib/rate-limit";
import { normalizeSearchQuery } from "@/lib/search-query";
import {
  parseImdbFind,
  parseMovie,
  parseSearchResults,
  parseTvSeason,
  parseTvShow,
  type ImdbFind,
} from "@/lib/tmdb/parse";
import {
  TMDB_ERROR_KINDS,
  type MediaType,
  type Movie,
  type SearchTitle,
  type TmdbError,
  type TmdbErrorKind,
  type TmdbResult,
  type TvSeason,
  type TvShow,
} from "@/lib/tmdb/types";

// TMDB allows about 50 requests a second per IP and has no daily cap.
// Stay a little under that so a burst never gets refused upstream.
const UPSTREAM_PER_SECOND = { limit: 35, windowMs: 1000 };
const UPSTREAM_PER_MINUTE = { limit: 1500, windowMs: 60 * 1000 };
// IMDb imports get their own smaller share, so a big import never
// leaves Up next, search and title pages without TMDB lookups.
const IMPORT_PER_SECOND = { limit: 10, windowMs: 1000 };
const IMPORT_PER_MINUTE = { limit: 400, windowMs: 60 * 1000 };
// When the per-second budget is full, wait this long at most for a free slot.
const SLOT_WAIT_MS = 5000;
const SEARCH_PER_USER = { limit: 60, windowMs: 10 * 60 * 1000 };
const SEARCH_GLOBAL = { limit: 120, windowMs: 10 * 60 * 1000 };

const MESSAGES: Record<TmdbErrorKind, string> = {
  missing_key:
    "TMDB is not configured. Add TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN to .env.local and restart the dev server.",
  offline: "Marquee could not reach TMDB. Check your connection and try again.",
  unauthorized:
    "TMDB rejected the API key. Check TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN in .env.local.",
  rate_limit: "TMDB rate limit reached. Wait a minute and try again.",
  unavailable: "TMDB is unavailable right now. Try again shortly.",
  not_found: "TMDB has no title with that id.",
  bad_response: "TMDB returned a response Marquee could not read.",
};

type TmdbCredentials =
  | { type: "bearer"; token: string }
  | { type: "api_key"; apiKey: string };

export function hasTmdbCredentials(): boolean {
  return getTmdbCredentials() !== null;
}

function getTmdbCredentials(): TmdbCredentials | null {
  const token = readEnv("TMDB_READ_ACCESS_TOKEN");
  if (token) {
    return { type: "bearer", token };
  }
  const apiKey = readEnv("TMDB_API_KEY");
  if (apiKey) {
    return { type: "api_key", apiKey };
  }
  return null;
}

function failure(kind: TmdbErrorKind, message?: string): TmdbError {
  return { kind, message: message ?? MESSAGES[kind] };
}

/**
 * Checked before the cache. Only the key is checked here: the request budget is
 * charged in tmdbGet, which runs on a cache miss, so cached answers cost nothing.
 */
function gateTmdb(): TmdbError | null {
  if (!hasTmdbCredentials()) {
    return failure("missing_key");
  }
  return null;
}

type Budget = "app" | "import";

/**
 * TMDB requests the app can still make this minute.
 * Heavy background work (like filling in episodes during an import) checks this first
 * so it leaves room for the pages people are looking at.
 */
export function tmdbHeadroom(): { minute: number } {
  return { minute: remainingRateLimit("tmdb:minute", UPSTREAM_PER_MINUTE) };
}

const BUCKETS: Record<Budget, [string, { limit: number; windowMs: number }][]> = {
  app: [
    ["tmdb:second", UPSTREAM_PER_SECOND],
    ["tmdb:minute", UPSTREAM_PER_MINUTE],
  ],
  import: [
    ["tmdb:import:second", IMPORT_PER_SECOND],
    ["tmdb:import:minute", IMPORT_PER_MINUTE],
    ["tmdb:second", UPSTREAM_PER_SECOND],
    ["tmdb:minute", UPSTREAM_PER_MINUTE],
  ],
};

/** Takes one request slot from every bucket, or none if any bucket is full. */
function takeSlot(budget: Budget): boolean {
  const buckets = BUCKETS[budget];
  // Check every bucket before using any, so a full bucket does not waste the others.
  if (buckets.some(([key, window]) => remainingRateLimit(key, window) === 0)) {
    return false;
  }
  for (const [key, window] of buckets) {
    consumeRateLimit(key, window);
  }
  return true;
}

/**
 * Waits for a request slot. Short bursts (like Up next loading many shows) queue up
 * for a moment instead of failing. Gives up after SLOT_WAIT_MS.
 */
async function waitForSlot(budget: Budget): Promise<TmdbError | null> {
  const deadline = Date.now() + SLOT_WAIT_MS;
  while (!takeSlot(budget)) {
    if (Date.now() >= deadline) {
      return failure(
        "rate_limit",
        budget === "import"
          ? "Marquee is pacing the import so the rest of the app keeps working. It will carry on shortly."
          : "TMDB is busy. Try again in a moment.",
      );
    }
    await sleep(60 + Math.random() * 90);
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function raiseTmdb(error: TmdbError): never {
  throw new Error(`tmdb:${error.kind}:${error.message}`);
}

function isTmdbErrorKind(value: string): value is TmdbErrorKind {
  return (TMDB_ERROR_KINDS as readonly string[]).includes(value);
}

function parseTmdbMessage(message: string): TmdbError | null {
  const prefix = "tmdb:";
  if (!message.startsWith(prefix)) {
    return null;
  }
  const rest = message.slice(prefix.length);
  const splitAt = rest.indexOf(":");
  if (splitAt <= 0) {
    return null;
  }
  const kind = rest.slice(0, splitAt);
  const text = rest.slice(splitAt + 1);
  if (!isTmdbErrorKind(kind) || text.length === 0) {
    return null;
  }
  return { kind, message: text };
}

function parseThrown(error: unknown): TmdbError | null {
  if (!(error instanceof Error)) {
    return null;
  }
  const parsed = parseTmdbMessage(error.message);
  if (parsed) {
    return parsed;
  }
  return error.cause ? parseThrown(error.cause) : null;
}

async function runCached<T>(load: () => Promise<T>): Promise<TmdbResult<T>> {
  try {
    return { ok: true, data: await load() };
  } catch (error) {
    const parsed = parseThrown(error);
    if (parsed) {
      return { ok: false, error: parsed };
    }
    throw error;
  }
}

async function tmdbGet(
  path: string,
  query: Record<string, string>,
  budget: Budget = "app",
): Promise<unknown> {
  const credentials = getTmdbCredentials();
  if (!credentials) {
    raiseTmdb(failure("missing_key"));
  }
  // Only real network calls reach here (cache misses), so only they use up the budget.
  const paused = await waitForSlot(budget);
  if (paused) {
    raiseTmdb(paused);
  }

  const url = new URL(`https://api.themoviedb.org/3${path}`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const headers = new Headers({ accept: "application/json" });
  if (credentials.type === "bearer") {
    headers.set("Authorization", `Bearer ${credentials.token}`);
  } else {
    url.searchParams.set("api_key", credentials.apiKey);
  }

  let response = await fetchTmdb(url, headers);
  if (response.status === 429) {
    // TMDB asked us to slow down. Wait as long as it says (up to 2 s) and try once more.
    const retryAfter = Number(response.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 2000) : 1000;
    await sleep(waitMs);
    response = await fetchTmdb(url, headers);
  }

  if (response.status === 401 || response.status === 403) {
    raiseTmdb(failure("unauthorized"));
  }
  if (response.status === 404) {
    raiseTmdb(failure("not_found"));
  }
  if (response.status === 429) {
    raiseTmdb(failure("rate_limit"));
  }
  if (!response.ok) {
    raiseTmdb(failure("unavailable"));
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    raiseTmdb(failure("bad_response"));
  }
}

async function fetchTmdb(url: URL, headers: Headers): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    raiseTmdb(
      timedOut
        ? failure("unavailable", "TMDB took too long to respond. Try again.")
        : failure("offline"),
    );
  }

  return response;
}

export async function searchTitles(
  query: string,
  userId: string,
): Promise<TmdbResult<SearchTitle[]>> {
  await connection();
  const normalized = normalizeSearchQuery(query);
  if (!normalized) {
    return {
      ok: false,
      error: failure("bad_response", "Use 2 to 80 characters."),
    };
  }
  if (userId.length === 0) {
    return {
      ok: false,
      error: failure("unauthorized", "Sign in before searching."),
    };
  }
  if (!hasTmdbCredentials()) {
    return { ok: false, error: failure("missing_key") };
  }
  const allowed =
    consumeRateLimit(`search:${userId}`, SEARCH_PER_USER) &&
    consumeRateLimit("search:all", SEARCH_GLOBAL);
  if (!allowed) {
    return {
      ok: false,
      error: failure(
        "rate_limit",
        "Too many searches. Wait a few minutes and try again.",
      ),
    };
  }
  return runCached(() => searchTitlesCached(normalized));
}

async function searchTitlesCached(query: string): Promise<SearchTitle[]> {
  "use cache";
  cacheLife("minutes");

  const body = await tmdbGet("/search/multi", {
    query,
    include_adult: "false",
    language: "en-US",
  });
  const titles = parseSearchResults(body);
  if (!titles) {
    raiseTmdb(failure("bad_response"));
  }
  return titles;
}

export async function getTvShow(id: number): Promise<TmdbResult<TvShow>> {
  await connection();
  const blocked = gateTmdb();
  if (blocked) {
    return { ok: false, error: blocked };
  }
  return runCached(() => getTvShowCached(id));
}

async function getTvShowCached(id: number): Promise<TvShow> {
  "use cache";
  cacheLife("hours");

  const body = await tmdbGet(`/tv/${id}`, { language: "en-US" });
  const show = parseTvShow(body);
  if (!show) {
    raiseTmdb(failure("bad_response"));
  }
  return show;
}

export async function getTvSeason(
  id: number,
  seasonNumber: number,
): Promise<TmdbResult<TvSeason>> {
  await connection();
  const blocked = gateTmdb();
  if (blocked) {
    return { ok: false, error: blocked };
  }
  return runCached(() => getTvSeasonCached(id, seasonNumber));
}

async function getTvSeasonCached(
  id: number,
  seasonNumber: number,
): Promise<TvSeason> {
  "use cache";
  cacheLife("hours");

  const body = await tmdbGet(`/tv/${id}/season/${seasonNumber}`, {
    language: "en-US",
  });
  const season = parseTvSeason(body, seasonNumber);
  if (!season) {
    raiseTmdb(failure("bad_response"));
  }
  return season;
}

const TRENDING_CAP = 50;

export async function listTrending(
  mediaType: MediaType,
  pages = 1,
): Promise<TmdbResult<SearchTitle[]>> {
  await connection();
  const blocked = gateTmdb();
  if (blocked) {
    return { ok: false, error: blocked };
  }
  const count = pages > 1 ? 3 : 1;
  return runCached(() => listTrendingCached(mediaType, count));
}

async function listTrendingCached(
  mediaType: MediaType,
  pages: number,
): Promise<SearchTitle[]> {
  "use cache";
  cacheLife("hours");

  const collected: SearchTitle[] = [];
  const seen = new Set<number>();
  for (let page = 1; page <= pages; page += 1) {
    const body = await tmdbGet(`/trending/${mediaType}/week`, {
      language: "en-US",
      page: String(page),
    });
    const titles = parseSearchResults(body, mediaType);
    if (!titles) {
      raiseTmdb(failure("bad_response"));
    }
    for (const title of titles) {
      if (seen.has(title.id)) {
        continue;
      }
      seen.add(title.id);
      collected.push(title);
      if (collected.length === TRENDING_CAP) {
        return collected;
      }
    }
  }
  return collected;
}

export async function listPopular(
  mediaType: MediaType,
): Promise<TmdbResult<SearchTitle[]>> {
  await connection();
  const blocked = gateTmdb();
  if (blocked) {
    return { ok: false, error: blocked };
  }
  return runCached(() => listPopularCached(mediaType));
}

async function listPopularCached(mediaType: MediaType): Promise<SearchTitle[]> {
  "use cache";
  cacheLife("hours");

  const path = mediaType === "tv" ? "/tv/popular" : "/movie/popular";
  const body = await tmdbGet(path, { language: "en-US" });
  const titles = parseSearchResults(body, mediaType);
  if (!titles) {
    raiseTmdb(failure("bad_response"));
  }
  return titles;
}

export async function findByImdbId(imdbId: string): Promise<TmdbResult<ImdbFind>> {
  await connection();
  if (!/^tt\d{7,10}$/.test(imdbId)) {
    return { ok: false, error: failure("not_found") };
  }
  const blocked = gateTmdb();
  if (blocked) {
    return { ok: false, error: blocked };
  }
  return runCached(() => findByImdbCached(imdbId));
}

async function findByImdbCached(imdbId: string): Promise<ImdbFind> {
  "use cache";
  cacheLife("hours");

  const body = await tmdbGet(
    `/find/${imdbId}`,
    { external_source: "imdb_id", language: "en-US" },
    "import",
  );
  const found = parseImdbFind(body);
  if (!found) {
    raiseTmdb(failure("bad_response"));
  }
  return found;
}

export async function getMovie(id: number): Promise<TmdbResult<Movie>> {
  await connection();
  const blocked = gateTmdb();
  if (blocked) {
    return { ok: false, error: blocked };
  }
  return runCached(() => getMovieCached(id));
}

async function getMovieCached(id: number): Promise<Movie> {
  "use cache";
  cacheLife("hours");

  const body = await tmdbGet(`/movie/${id}`, { language: "en-US" });
  const movie = parseMovie(body);
  if (!movie) {
    raiseTmdb(failure("bad_response"));
  }
  return movie;
}
