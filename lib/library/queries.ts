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
};

export type EpisodeWatch = {
  showTmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  runtimeMinutes: number | null;
  rating: number | null;
  note: string | null;
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

export type LibraryCode = "schema" | "save" | "rating" | "date" | "note" | "missing" | "unwatched";

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

function mapShow(row: ShowRow): TrackedShow | null {
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
  };
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

async function client(): Promise<SupabaseClient<Database>> {
  return createClient();
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
    supabase
      .from("tracked_shows")
      .select("user_id, tmdb_id, status, title, year, poster_url, genres, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("tracked_movies")
      .select(
        "user_id, tmdb_id, status, title, year, poster_url, genres, runtime_minutes, watched_on, rating, note, created_at, updated_at",
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("episode_watches")
      .select(
        "user_id, show_tmdb_id, season_number, episode_number, name, runtime_minutes, rating, note, watched_at",
      )
      .eq("user_id", userId),
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

export async function loadShowProgress(
  userId: string,
  tmdbId: number,
): Promise<LibraryResult<{ show: TrackedShow | null; episodes: EpisodeWatch[] }>> {
  const supabase = await client();
  const [show, episodes] = await Promise.all([
    supabase
      .from("tracked_shows")
      .select("user_id, tmdb_id, status, title, year, poster_url, genres, created_at, updated_at")
      .eq("user_id", userId)
      .eq("tmdb_id", tmdbId)
      .maybeSingle(),
    supabase
      .from("episode_watches")
      .select(
        "user_id, show_tmdb_id, season_number, episode_number, name, runtime_minutes, rating, note, watched_at",
      )
      .eq("user_id", userId)
      .eq("show_tmdb_id", tmdbId),
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
