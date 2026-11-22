import "server-only";

import { parseImdbCsv, type ImdbCsvRow } from "@/lib/imdb-csv";
import type { MovieStatus, ShowStatus } from "@/lib/library/database";
import { markAllAiredEpisodes, saveMovieStatus, saveShowStatus } from "@/lib/library/save";
import type { LibraryResult } from "@/lib/library/queries";
import { libraryFailure, selectAllPages } from "@/lib/library/queries";
import { ratingToStored } from "@/lib/rating";
import { createClient } from "@/lib/supabase/server";
import { findByImdbId, tmdbHeadroom } from "@/lib/tmdb/client";
import type { ImdbFind } from "@/lib/tmdb/parse";

const LOOKUP_CAP = 50;
const LOOKUP_CONCURRENCY = 6;
// Filling in a show's episodes costs one TMDB request per season. Only do it while
// this much of the app's budget is left, so Up next and search keep working.
const RESERVE_PER_MINUTE = 300;

export type ImportItem = {
  imdbId: string;
  title: string;
  /** Why it was not imported, for failed titles. */
  reason?: string;
};

export type ImportSummary = {
  imported: number;
  /** Rated shows whose aired episodes were all marked watched. */
  completed: number;
  /** Titles in the file, for progress. */
  totalRows: number;
  /** The titles behind the skipped, unmatched and failed counts, so people can see which ones. */
  skippedItems: ImportItem[];
  unmatchedItems: ImportItem[];
  failedItems: ImportItem[];
  skipped: number;
  unmatched: number;
  failed: number;
  remaining: number;
  idsStored: boolean;
  /** True when TMDB lookups were paused by a rate limit. The caller can wait and upload again. */
  paused: boolean;
  /** Row to start from on the next upload of the same file, or null when the file is done. */
  nextCursor: number | null;
  problem: string | null;
};

type Hit =
  | { kind: "movie"; id: number }
  | { kind: "tv"; id: number }
  | {
      kind: "episode";
      showId: number;
      seasonNumber: number;
      episodeNumber: number;
      name: string;
      runtime: number | null;
    };

export async function importImdbCsv(
  userId: string,
  csv: string,
  cursor = 0,
): Promise<LibraryResult<ImportSummary>> {
  const parsed = parseImdbCsv(csv);
  if (!parsed.ok) {
    return {
      ok: true,
      data: {
        imported: 0,
        completed: 0,
        totalRows: 0,
        skippedItems: [],
        unmatchedItems: [],
        failedItems: [],
        skipped: 0,
        unmatched: 0,
        failed: 0,
        remaining: 0,
        idsStored: true,
        paused: false,
        nextCursor: null,
        problem: parsed.error,
      },
    };
  }

  const summary: ImportSummary = {
    imported: 0,
    completed: 0,
    totalRows: parsed.rows.length,
    skippedItems: [],
    unmatchedItems: [],
    failedItems: [],
    skipped: 0,
    unmatched: 0,
    failed: 0,
    remaining: 0,
    idsStored: true,
    paused: false,
    nextCursor: null,
    problem: null,
  };
  const item = (row: ImdbCsvRow, reason?: string): ImportItem =>
    reason ? { imdbId: row.imdbId, title: row.title, reason } : { imdbId: row.imdbId, title: row.title };
  const skip = (row: ImdbCsvRow) => {
    summary.skipped += 1;
    summary.skippedItems.push(item(row));
  };
  const fail = (row: ImdbCsvRow, reason: string) => {
    summary.failed += 1;
    summary.failedItems.push(item(row, reason));
  };

  const known = await loadKnownIds(userId);
  const shows = await loadShowState(userId);
  // A rated show already in the library with no watched episodes still needs them filled in.
  const needsEpisodes = (row: ImdbCsvRow): number | null => {
    if (row.rating === null) {
      return null;
    }
    const showId = shows.byImdb.get(row.imdbId);
    return showId !== undefined && !shows.withEpisodes.has(showId) ? showId : null;
  };
  const needsWork = (row: ImdbCsvRow) => !known.has(row.imdbId) || needsEpisodes(row) !== null;

  const startAt = Math.min(Math.max(0, Math.floor(cursor)), parsed.rows.length);
  // Pick the next LOOKUP_CAP titles that still need work, keeping their place in the file.
  const batch: { row: ImdbCsvRow; at: number; showId: number | null }[] = [];
  let scanned = startAt;
  for (; scanned < parsed.rows.length && batch.length < LOOKUP_CAP; scanned += 1) {
    const row = parsed.rows[scanned];
    if (!row) {
      continue;
    }
    if (!needsWork(row)) {
      skip(row);
      continue;
    }
    batch.push({ row, at: scanned, showId: known.has(row.imdbId) ? needsEpisodes(row) : null });
  }
  let nextCursor: number | null = scanned < parsed.rows.length ? scanned : null;

  /** Marks a rated show's aired episodes. Returns false when TMDB needs a break. */
  const completeShow = async (showId: number, row: ImdbCsvRow): Promise<boolean> => {
    const room = tmdbHeadroom();
    if (room.minute < RESERVE_PER_MINUTE) {
      return false;
    }
    const marked = await markAllAiredEpisodes(userId, showId, row.date);
    if (!marked.ok) {
      if (marked.busy) {
        return false;
      }
      fail(
        row,
        marked.error === "missing"
          ? "TMDB has no episode list for this show."
          : "Its episodes could not be saved.",
      );
      return true;
    }
    shows.withEpisodes.add(showId);
    if (marked.marked > 0) {
      summary.completed += 1;
    }
    return true;
  };

  // Look titles up a few at a time, then save them one by one in file order.
  for (let start = 0; start < batch.length; start += LOOKUP_CONCURRENCY) {
    const group = batch.slice(start, start + LOOKUP_CONCURRENCY);
    const results = await Promise.all(
      group.map(({ row, showId }) => (showId === null ? findByImdbId(row.imdbId) : null)),
    );

    let pausedAt: number | null = null;
    for (const [index, { row, at, showId }] of group.entries()) {
      if (showId !== null) {
        if (!(await completeShow(showId, row))) {
          pausedAt ??= at;
        }
        continue;
      }

      const found = results[index];
      if (!found) {
        continue;
      }
      if (!found.ok) {
        if (found.error.kind === "rate_limit") {
          pausedAt ??= at;
          continue;
        }
        fail(row, found.error.message);
        continue;
      }

      const hit = chooseHit(found.data, row.titleType);
      if (!hit) {
        summary.unmatched += 1;
        summary.unmatchedItems.push(item(row, row.titleType ? `IMDb type: ${row.titleType}` : undefined));
        continue;
      }

      const saved = await writeHit(userId, row, hit, summary);
      if (!saved.ok) {
        if (saved.error === "schema") {
          return saved;
        }
        fail(row, saveReason(saved.error));
        continue;
      }
      known.add(row.imdbId);
      if (saved.data === "skipped") {
        skip(row);
      } else {
        summary.imported += 1;
      }

      if (hit.kind === "tv" && row.rating !== null) {
        // Rated on IMDb means watched: mark every aired episode, like a watched movie.
        shows.byImdb.set(row.imdbId, hit.id);
        if (!(await completeShow(hit.id, row))) {
          // The show is saved. The next upload picks it up and fills in its episodes.
          pausedAt ??= at;
        }
      }
    }

    if (pausedAt !== null) {
      // Start again from the first title that had to wait. Titles after it that did save are skipped next time.
      summary.paused = true;
      nextCursor = pausedAt;
      break;
    }
  }

  summary.nextCursor = nextCursor;
  summary.remaining =
    nextCursor === null ? 0 : parsed.rows.slice(nextCursor).filter(needsWork).length;
  return { ok: true, data: summary };
}

function saveReason(code: string): string {
  if (code === "missing") {
    return "TMDB could not find the details for this title.";
  }
  return "It could not be saved to your library.";
}

async function writeHit(
  userId: string,
  row: ImdbCsvRow,
  hit: Hit,
  summary: ImportSummary,
): Promise<LibraryResult<"imported" | "skipped">> {
  if (hit.kind === "movie") {
    return writeMovie(userId, row, hit.id, summary);
  }
  if (hit.kind === "tv") {
    return writeShow(userId, row, hit.id, summary);
  }
  return writeEpisode(userId, row, hit, summary);
}

async function writeMovie(
  userId: string,
  row: ImdbCsvRow,
  tmdbId: number,
  summary: ImportSummary,
): Promise<LibraryResult<"imported" | "skipped">> {
  const supabase = await createClient();
  const existing = await supabase
    .from("tracked_movies")
    .select("status")
    .eq("user_id", userId)
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  if (existing.error) {
    return { ok: false, error: libraryFailure(existing.error) };
  }
  if (row.rating === null && existing.data) {
    summary.idsStored = (await rememberMovie(userId, tmdbId, row.imdbId)) && summary.idsStored;
    return { ok: true, data: "skipped" };
  }

  const status: MovieStatus = row.rating === null ? "watchlist" : "watched";
  const saved = await saveMovieStatus(
    userId,
    tmdbId,
    status,
    row.date,
    row.rating === null ? null : String(row.rating),
    null,
  );
  if (!saved.ok) {
    return saved;
  }
  summary.idsStored = (await rememberMovie(userId, tmdbId, row.imdbId)) && summary.idsStored;
  return { ok: true, data: "imported" };
}

async function writeShow(
  userId: string,
  row: ImdbCsvRow,
  tmdbId: number,
  summary: ImportSummary,
): Promise<LibraryResult<"imported" | "skipped">> {
  const supabase = await createClient();
  const existing = await supabase
    .from("tracked_shows")
    .select("status")
    .eq("user_id", userId)
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  if (existing.error) {
    return { ok: false, error: libraryFailure(existing.error) };
  }
  if (row.rating === null && existing.data) {
    summary.idsStored = (await rememberShow(userId, tmdbId, row.imdbId)) && summary.idsStored;
    return { ok: true, data: "skipped" };
  }

  const current = existing.data?.status;
  const status: ShowStatus =
    row.rating !== null && (current === "watching" || current === "stopped")
      ? current
      : row.rating === null
        ? "watchlist"
        : "watching";
  const saved = await saveShowStatus(
    userId,
    tmdbId,
    status,
    row.rating === null ? null : String(row.rating),
  );
  if (!saved.ok) {
    return saved;
  }
  summary.idsStored = (await rememberShow(userId, tmdbId, row.imdbId)) && summary.idsStored;
  return { ok: true, data: "imported" };
}

async function writeEpisode(
  userId: string,
  row: ImdbCsvRow,
  hit: Extract<Hit, { kind: "episode" }>,
  summary: ImportSummary,
): Promise<LibraryResult<"imported" | "skipped">> {
  const supabase = await createClient();
  const show = await supabase
    .from("tracked_shows")
    .select("tmdb_id")
    .eq("user_id", userId)
    .eq("tmdb_id", hit.showId)
    .maybeSingle();
  if (show.error) {
    return { ok: false, error: libraryFailure(show.error) };
  }
  if (!show.data) {
    const ensured = await saveShowStatus(userId, hit.showId, "watching", null);
    if (!ensured.ok) {
      return ensured;
    }
  }

  const rating = row.rating === null ? null : ratingToStored(row.rating);
  const written = await supabase.from("episode_watches").upsert(
    {
      user_id: userId,
      show_tmdb_id: hit.showId,
      season_number: hit.seasonNumber,
      episode_number: hit.episodeNumber,
      name: hit.name,
      runtime_minutes: hit.runtime,
      rating,
      ...(row.date ? { watched_at: `${row.date}T00:00:00.000Z` } : {}),
    },
    { onConflict: "user_id,show_tmdb_id,season_number,episode_number" },
  );
  if (written.error) {
    return { ok: false, error: libraryFailure(written.error) };
  }
  summary.idsStored =
    (await rememberEpisode(userId, hit, row.imdbId)) && summary.idsStored;
  return { ok: true, data: "imported" };
}

function chooseHit(found: ImdbFind, titleType: string): Hit | null {
  const kind = titleType.toLowerCase().replace(/[\s_-]/g, "");
  const episode = found.episode
    ? { kind: "episode" as const, ...found.episode }
    : null;
  const show = found.showId ? { kind: "tv" as const, id: found.showId } : null;
  const movie = found.movieId ? { kind: "movie" as const, id: found.movieId } : null;
  if (kind === "tvepisode" || kind === "tvspecial") {
    return episode ?? show ?? movie;
  }
  if (kind === "tvseries" || kind === "tvminiseries") {
    return show ?? movie ?? episode;
  }
  return movie ?? show ?? episode;
}

async function loadKnownIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const known = new Set<string>();
  const tables = ["tracked_shows", "tracked_movies", "episode_watches"] as const;
  for (const table of tables) {
    const result = await supabase.from(table).select("imdb_id").eq("user_id", userId);
    if (result.error) {
      continue;
    }
    for (const row of result.data) {
      if (typeof row.imdb_id === "string" && row.imdb_id.length > 0) {
        known.add(row.imdb_id);
      }
    }
  }
  return known;
}

/** Shows in the library by IMDb id, and the shows that have at least one watched episode. */
async function loadShowState(
  userId: string,
): Promise<{ byImdb: Map<string, number>; withEpisodes: Set<number> }> {
  const supabase = await createClient();
  const byImdb = new Map<string, number>();
  const withEpisodes = new Set<number>();
  const tracked = await supabase
    .from("tracked_shows")
    .select("tmdb_id, imdb_id")
    .eq("user_id", userId);
  if (!tracked.error) {
    for (const row of tracked.data) {
      if (typeof row.imdb_id === "string" && row.imdb_id.length > 0) {
        byImdb.set(row.imdb_id, row.tmdb_id);
      }
    }
  }
  // A long history has far more than the 1000 rows Supabase returns per request.
  const watched = await selectAllPages((from, to) =>
    supabase
      .from("episode_watches")
      .select("show_tmdb_id")
      .eq("user_id", userId)
      .order("show_tmdb_id")
      .range(from, to),
  );
  for (const row of watched.data ?? []) {
    withEpisodes.add(row.show_tmdb_id);
  }
  return { byImdb, withEpisodes };
}

async function rememberShow(
  userId: string,
  tmdbId: number,
  imdbId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const updated = await supabase
    .from("tracked_shows")
    .update({ imdb_id: imdbId })
    .eq("user_id", userId)
    .eq("tmdb_id", tmdbId);
  return !updated.error;
}

async function rememberMovie(
  userId: string,
  tmdbId: number,
  imdbId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const updated = await supabase
    .from("tracked_movies")
    .update({ imdb_id: imdbId })
    .eq("user_id", userId)
    .eq("tmdb_id", tmdbId);
  return !updated.error;
}

async function rememberEpisode(
  userId: string,
  hit: Extract<Hit, { kind: "episode" }>,
  imdbId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const updated = await supabase
    .from("episode_watches")
    .update({ imdb_id: imdbId })
    .eq("user_id", userId)
    .eq("show_tmdb_id", hit.showId)
    .eq("season_number", hit.seasonNumber)
    .eq("episode_number", hit.episodeNumber);
  return !updated.error;
}
