import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  EpisodeWatchRow,
  MovieRow,
  MovieStatus,
  ShowRow,
  ShowStatus,
} from "@/lib/library/database";
import { createClient } from "@/lib/supabase/server";

export type TrackedShow = {
  tmdbId: number;
  status: ShowStatus;
  title: string;
  year: string | null;
  posterUrl: string | null;
  genres: string[];
  rating: number | null;
};

export type EpisodeWatch = {
  showTmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  runtimeMinutes: number | null;
  rating: number | null;
  note: string | null;
  watchedAt: string;
};

export type TrackedMovie = {
  tmdbId: number;
  status: MovieStatus;
  title: string;
  year: string | null;
  posterUrl: string | null;
  genres: string[];
  runtimeMinutes: number | null;
  watchedOn: string | null;
  rating: number | null;
  note: string | null;
};

export type LibraryCode =
  | "schema"
  | "save"
  | "rating"
  | "date"
  | "note"
  | "missing"
  | "unwatched"
  | "rejected";

export type LibraryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: LibraryCode };

const SHOW_STATUSES: readonly ShowStatus[] = ["watching", "watchlist", "stopped"];
const MOVIE_STATUSES: readonly MovieStatus[] = ["watchlist", "watched"];

function isShowStatus(value: string): value is ShowStatus {
  return (SHOW_STATUSES as readonly string[]).includes(value);
}

function isMovieStatus(value: string): value is MovieStatus {
  return (MOVIE_STATUSES as readonly string[]).includes(value);
}

export function libraryFailure(error: {
  code?: string;
  message: string;
}): LibraryCode {
  const message = error.message.toLowerCase();
  if (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  ) {
    return "schema";
  }
  return "save";
}

function mapShow(
  row: Omit<ShowRow, "rating"> & { rating?: number | null },
): TrackedShow | null {
  if (!isShowStatus(row.status)) {
    return null;
  }
  return {
    tmdbId: row.tmdb_id,
    status: row.status,
    title: row.title,
    year: row.year,
    posterUrl: row.poster_url,
    genres: row.genres,
    rating: row.rating ?? null,
  };
}

const SHOW_COLUMNS =
  "user_id, tmdb_id, status, title, year, poster_url, genres, rating, created_at, updated_at";
const SHOW_COLUMNS_WITHOUT_RATING =
  "user_id, tmdb_id, status, title, year, poster_url, genres, created_at, updated_at";

function ratingColumnMissing(error: { message: string; code?: string }): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("rating") &&
    (message.includes("does not exist") ||
      message.includes("schema cache") ||
      error.code === "42703" ||
      error.code === "PGRST204")
  );
}

function mapEpisode(row: EpisodeWatchRow): EpisodeWatch {
  return {
    showTmdbId: row.show_tmdb_id,
    seasonNumber: row.season_number,
    episodeNumber: row.episode_number,
    name: row.name,
    runtimeMinutes: row.runtime_minutes,
    rating: row.rating,
    note: row.note,
    watchedAt: row.watched_at,
  };
}

function mapMovie(row: MovieRow): TrackedMovie | null {
  if (!isMovieStatus(row.status)) {
    return null;
  }
  return {
    tmdbId: row.tmdb_id,
    status: row.status,
    title: row.title,
    year: row.year,
    posterUrl: row.poster_url,
    genres: row.genres,
    runtimeMinutes: row.runtime_minutes,
    watchedOn: row.watched_on,
    rating: row.rating,
    note: row.note,
  };
}

const PAGE_SIZE = 1000;

/**
 * Supabase returns at most 1000 rows per request. Reads every page.
 * `page` must apply a stable order so rows do not shift between pages.
 * Ask for `{ count: "exact" }` in the select: with a count, the remaining pages
 * are fetched in parallel instead of one after another.
 */
export async function selectAllPages<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: { code?: string; message: string } | null;
    count?: number | null;
  }>,
): Promise<{ data: T[]; error: null } | { data: null; error: { code?: string; message: string } }> {
  const first = await page(0, PAGE_SIZE - 1);
  if (first.error) {
    return { data: null, error: first.error };
  }
  const rows: T[] = [...(first.data ?? [])];
  if (rows.length < PAGE_SIZE) {
    return { data: rows, error: null };
  }

  if (typeof first.count === "number") {
    const starts: number[] = [];
    for (let from = PAGE_SIZE; from < first.count; from += PAGE_SIZE) {
      starts.push(from);
    }
    const pages = await Promise.all(starts.map((from) => page(from, from + PAGE_SIZE - 1)));
    for (const result of pages) {
      if (result.error) {
        return { data: null, error: result.error };
      }
      rows.push(...(result.data ?? []));
    }
    return { data: rows, error: null };
  }

  // No count: read page by page until a short page.
  for (let from = PAGE_SIZE; ; from += PAGE_SIZE) {
    const result = await page(from, from + PAGE_SIZE - 1);
    if (result.error) {
      return { data: null, error: result.error };
    }
    const data = result.data ?? [];
    rows.push(...data);
    if (data.length < PAGE_SIZE) {
      return { data: rows, error: null };
    }
  }
}

const EPISODE_COLUMNS =
  "user_id, show_tmdb_id, season_number, episode_number, name, runtime_minutes, rating, note, watched_at";

async function client(): Promise<SupabaseClient<Database>> {
  return createClient();
}

async function loadShowRows(supabase: SupabaseClient<Database>, userId: string) {
  const withRating = await supabase
    .from("tracked_shows")
    .select(SHOW_COLUMNS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (!withRating.error || !ratingColumnMissing(withRating.error)) {
    return withRating;
  }
  const legacy = await supabase
    .from("tracked_shows")
    .select(SHOW_COLUMNS_WITHOUT_RATING)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (legacy.error) {
    return legacy;
  }
  return {
    ...legacy,
    data: legacy.data.map((row) => ({ ...row, rating: null })),
  };
}

async function loadShowRow(
  supabase: SupabaseClient<Database>,
  userId: string,
  tmdbId: number,
) {
  const withRating = await supabase
    .from("tracked_shows")
    .select(SHOW_COLUMNS)
    .eq("user_id", userId)
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  if (!withRating.error || !ratingColumnMissing(withRating.error)) {
    return withRating;
  }
  const legacy = await supabase
    .from("tracked_shows")
    .select(SHOW_COLUMNS_WITHOUT_RATING)
    .eq("user_id", userId)
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  if (legacy.error || legacy.data === null) {
    return legacy;
  }
  return {
    ...legacy,
    data: { ...legacy.data, rating: null },
  };
}

export async function loadLibrary(userId: string): Promise<
  LibraryResult<{
    shows: TrackedShow[];
    movies: TrackedMovie[];
    episodes: EpisodeWatch[];
  }>
> {
  const supabase = await client();
  const [shows, movies, episodes] = await Promise.all([
    loadShowRows(supabase, userId),
    supabase
      .from("tracked_movies")
      .select(
        "user_id, tmdb_id, status, title, year, poster_url, genres, runtime_minutes, watched_on, rating, note, created_at, updated_at",
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    selectAllPages((from, to) =>
      supabase
        .from("episode_watches")
        .select(EPISODE_COLUMNS, { count: "exact" })
        .eq("user_id", userId)
        .order("show_tmdb_id")
        .order("season_number")
        .order("episode_number")
        .range(from, to),
    ),
  ]);

  if (shows.error) {
    return { ok: false, error: libraryFailure(shows.error) };
  }
  if (movies.error) {
    return { ok: false, error: libraryFailure(movies.error) };
  }
  if (episodes.error) {
    return { ok: false, error: libraryFailure(episodes.error) };
  }

  return {
    ok: true,
    data: {
      shows: shows.data.flatMap((row) => {
        const show = mapShow(row);
        return show ? [show] : [];
      }),
      movies: movies.data.flatMap((row) => {
        const movie = mapMovie(row);
        return movie ? [movie] : [];
      }),
      episodes: episodes.data.map((row) => mapEpisode(row)),
    },
  };
}

/**
 * What Up next needs: tracked shows, and which episodes are watched.
 * Only three episode columns, so a long history loads fast.
 */
export async function loadUpNextLibrary(userId: string): Promise<
  LibraryResult<{
    shows: TrackedShow[];
    episodes: { showTmdbId: number; seasonNumber: number; episodeNumber: number }[];
  }>
> {
  const supabase = await client();
  const [shows, episodes] = await Promise.all([
    loadShowRows(supabase, userId),
    selectAllPages((from, to) =>
      supabase
        .from("episode_watches")
        .select("show_tmdb_id, season_number, episode_number", { count: "exact" })
        .eq("user_id", userId)
        .order("show_tmdb_id")
        .order("season_number")
        .order("episode_number")
        .range(from, to),
    ),
  ]);
  if (shows.error) {
    return { ok: false, error: libraryFailure(shows.error) };
  }
  if (episodes.error) {
    return { ok: false, error: libraryFailure(episodes.error) };
  }
  return {
    ok: true,
    data: {
      shows: shows.data.flatMap((row) => {
        const show = mapShow(row);
        return show ? [show] : [];
      }),
      episodes: episodes.data.map((row) => ({
        showTmdbId: row.show_tmdb_id,
        seasonNumber: row.season_number,
        episodeNumber: row.episode_number,
      })),
    },
  };
}

export async function loadShowProgress(
  userId: string,
  tmdbId: number,
): Promise<LibraryResult<{ show: TrackedShow | null; episodes: EpisodeWatch[] }>> {
  const supabase = await client();
  const [show, episodes] = await Promise.all([
    loadShowRow(supabase, userId, tmdbId),
    selectAllPages((from, to) =>
      supabase
        .from("episode_watches")
        .select(EPISODE_COLUMNS, { count: "exact" })
        .eq("user_id", userId)
        .eq("show_tmdb_id", tmdbId)
        .order("season_number")
        .order("episode_number")
        .range(from, to),
    ),
  ]);

  if (show.error) {
    return { ok: false, error: libraryFailure(show.error) };
  }
  if (episodes.error) {
    return { ok: false, error: libraryFailure(episodes.error) };
  }

  return {
    ok: true,
    data: {
      show: show.data ? mapShow(show.data) : null,
      episodes: episodes.data.map((row) => mapEpisode(row)),
    },
  };
}

export async function loadMovieProgress(
  userId: string,
  tmdbId: number,
): Promise<LibraryResult<TrackedMovie | null>> {
  const supabase = await client();
  const movie = await supabase
    .from("tracked_movies")
    .select(
      "user_id, tmdb_id, status, title, year, poster_url, genres, runtime_minutes, watched_on, rating, note, created_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  if (movie.error) {
    return { ok: false, error: libraryFailure(movie.error) };
  }

  return { ok: true, data: movie.data ? mapMovie(movie.data) : null };
}
