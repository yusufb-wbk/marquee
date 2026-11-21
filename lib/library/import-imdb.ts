import "server-only";

import { parseImdbCsv, type ImdbCsvRow } from "@/lib/imdb-csv";
import type { MovieStatus, ShowStatus } from "@/lib/library/database";
import { saveMovieStatus, saveShowStatus } from "@/lib/library/save";
import type { LibraryResult } from "@/lib/library/queries";
import { libraryFailure } from "@/lib/library/queries";
import { ratingToStored } from "@/lib/rating";
import { createClient } from "@/lib/supabase/server";
import { findByImdbId } from "@/lib/tmdb/client";
import type { ImdbFind } from "@/lib/tmdb/parse";

const LOOKUP_CAP = 25;

export type ImportSummary = {
  imported: number;
  skipped: number;
  unmatched: number;
  failed: number;
  remaining: number;
  idsStored: boolean;
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
): Promise<LibraryResult<ImportSummary>> {
  const parsed = parseImdbCsv(csv);
  if (!parsed.ok) {
    return {
      ok: true,
      data: {
        imported: 0,
        skipped: 0,
        unmatched: 0,
        failed: 0,
        remaining: 0,
        idsStored: true,
        problem: parsed.error,
      },
    };
  }

  const summary: ImportSummary = {
    imported: 0,
    skipped: 0,
    unmatched: 0,
    failed: 0,
    remaining: 0,
    idsStored: true,
    problem: null,
  };
  const known = await loadKnownIds(userId);
  let lookups = 0;

  for (const row of parsed.rows) {
    if (known.has(row.imdbId)) {
      summary.skipped += 1;
      continue;
    }
    if (lookups >= LOOKUP_CAP) {
      summary.remaining += 1;
      continue;
    }
    lookups += 1;

    const found = await findByImdbId(row.imdbId);
    if (!found.ok) {
      if (found.error.kind === "rate_limit") {
        summary.remaining += parsed.rows.length - parsed.rows.indexOf(row);
        break;
      }
      summary.failed += 1;
      continue;
    }

    const hit = chooseHit(found.data, row.titleType);
    if (!hit) {
      summary.unmatched += 1;
      continue;
    }

    const saved = await writeHit(userId, row, hit, summary);
    if (!saved.ok) {
      if (saved.error === "schema") {
        return saved;
      }
      summary.failed += 1;
      continue;
    }
    known.add(row.imdbId);
    if (saved.data === "skipped") {
      summary.skipped += 1;
    } else {
      summary.imported += 1;
    }
  }

  return { ok: true, data: summary };
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
