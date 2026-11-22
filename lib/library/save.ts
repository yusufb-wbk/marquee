import "server-only";

import { episodeKey, episodesUpTo, type EpisodeRef } from "@/lib/progress";
import { parseIsoDate, isoDateUTC } from "@/lib/calendar";
import {
  libraryFailure,
  selectAllPages,
  type LibraryCode,
  type LibraryResult,
} from "@/lib/library/queries";
import { parseNoteField, parseRatingField } from "@/lib/rating";
import { createClient } from "@/lib/supabase/server";
import { getMovie, getTvSeason, getTvShow } from "@/lib/tmdb/client";
import type { Episode } from "@/lib/tmdb/types";

type Saved = LibraryResult<true>;

const SHOW_STATUSES = ["watching", "watchlist", "stopped", "remove"] as const;
const MOVIE_STATUSES = ["watchlist", "watched", "remove"] as const;

type ShowIntent = (typeof SHOW_STATUSES)[number];
type MovieIntent = (typeof MOVIE_STATUSES)[number];

function isShowIntent(value: string): value is ShowIntent {
  return (SHOW_STATUSES as readonly string[]).includes(value);
}

function isMovieIntent(value: string): value is MovieIntent {
  return (MOVIE_STATUSES as readonly string[]).includes(value);
}

function snapshot(input: {
  title: string;
  year: string | null;
  posterUrl: string | null;
  genres: string[];
}) {
  const genres: string[] = [];
  for (const genre of input.genres) {
    const name = genre.trim().slice(0, 40);
    if (name.length > 0 && genres.length < 8) {
      genres.push(name);
    }
  }
  return {
    title: input.title.slice(0, 300),
    year: input.year && /^\d{4}$/.test(input.year) ? input.year : null,
    poster_url:
      input.posterUrl &&
      input.posterUrl.startsWith("https://image.tmdb.org/t/p/")
        ? input.posterUrl
        : null,
    genres,
  };
}

function savedOr(error: { code?: string; message: string } | null): Saved {
  if (!error) {
    return { ok: true, data: true };
  }
  return { ok: false, error: libraryFailure(error) };
}

export async function saveTrackedRating(
  userId: string,
  kind: string,
  tmdbId: number,
  ratingRaw: FormDataEntryValue | null,
): Promise<Saved> {
  if (kind !== "tv" && kind !== "movie") {
    return { ok: false, error: "save" };
  }
  const rating = parseRatingField(ratingRaw);
  if (!rating.ok) {
    return { ok: false, error: "rating" };
  }
  const supabase = await createClient();
  const table = kind === "tv" ? "tracked_shows" : "tracked_movies";
  const written = await supabase
    .from(table)
    .update({
      rating: rating.rating,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("tmdb_id", tmdbId)
    .select("tmdb_id");
  if (written.error) {
    return savedOr(written.error);
  }
  if (written.data.length === 0) {
    return { ok: false, error: "missing" };
  }
  return { ok: true, data: true };
}

export async function saveShowStatus(
  userId: string,
  tmdbId: number,
  status: string,
  ratingRaw: FormDataEntryValue | null = null,
): Promise<Saved> {
  if (!isShowIntent(status)) {
    return { ok: false, error: "save" };
  }

  const supabase = await createClient();
  if (status === "remove") {
    const episodes = await supabase
      .from("episode_watches")
      .delete()
      .eq("user_id", userId)
      .eq("show_tmdb_id", tmdbId);
    if (episodes.error) {
      return { ok: false, error: libraryFailure(episodes.error) };
    }
    const show = await supabase
      .from("tracked_shows")
      .delete()
      .eq("user_id", userId)
      .eq("tmdb_id", tmdbId);
    return savedOr(show.error);
  }

  const rating = parseRatingField(ratingRaw);
  if (!rating.ok) {
    return { ok: false, error: "rating" };
  }

  const loaded = await getTvShow(tmdbId);
  if (!loaded.ok) {
    return { ok: false, error: loaded.error.kind === "not_found" ? "missing" : "save" };
  }

  const show = loaded.data;
  const written = await supabase.from("tracked_shows").upsert(
    {
      user_id: userId,
      tmdb_id: tmdbId,
      status,
      ...snapshot({
        title: show.name,
        year: show.year,
        posterUrl: show.posterUrl,
        genres: show.genres,
      }),
      rating: rating.rating,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,tmdb_id" },
  );
  return savedOr(written.error);
}

export async function saveMovieStatus(
  userId: string,
  tmdbId: number,
  status: string,
  watchedOnRaw: FormDataEntryValue | null,
  ratingRaw: FormDataEntryValue | null,
  noteRaw: FormDataEntryValue | null,
): Promise<Saved> {
  if (!isMovieIntent(status)) {
    return { ok: false, error: "save" };
  }
  const rating = parseRatingField(ratingRaw);
  if (!rating.ok) {
    return { ok: false, error: "rating" };
  }
  const note = parseNoteField(noteRaw);
  if (!note.ok) {
    return { ok: false, error: "note" };
  }

  const supabase = await createClient();
  if (status === "remove") {
    const removed = await supabase
      .from("tracked_movies")
      .delete()
      .eq("user_id", userId)
      .eq("tmdb_id", tmdbId);
    return savedOr(removed.error);
  }

  const watchedOn =
    status === "watched"
      ? parseIsoDate(
          typeof watchedOnRaw === "string" && watchedOnRaw.length > 0
            ? watchedOnRaw
            : isoDateUTC(new Date()),
        )
      : null;
  if (status === "watched" && watchedOn === null) {
    return { ok: false, error: "date" };
  }

  const loaded = await getMovie(tmdbId);
  if (!loaded.ok) {
    return { ok: false, error: loaded.error.kind === "not_found" ? "missing" : "save" };
  }
  const movie = loaded.data;
  const written = await supabase.from("tracked_movies").upsert(
    {
      user_id: userId,
      tmdb_id: tmdbId,
      status,
      ...snapshot({
        title: movie.title,
        year: movie.year,
        posterUrl: movie.posterUrl,
        genres: movie.genres,
      }),
      runtime_minutes: movie.runtime,
      watched_on: watchedOn,
      rating: rating.rating,
      ...(typeof noteRaw === "string" ? { note: note.note } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,tmdb_id" },
  );
  return savedOr(written.error);
}

type EpisodeIntent =
  | "watch"
  | "unwatch"
  | "unwatch_season"
  | "unwatch_later"
  | "season"
  | "earlier"
  | "upto"
  | "save";

function isEpisodeIntent(value: string): value is EpisodeIntent {
  return (
    value === "watch" ||
    value === "unwatch" ||
    value === "unwatch_season" ||
    value === "unwatch_later" ||
    value === "season" ||
    value === "earlier" ||
    value === "upto" ||
    value === "save"
  );
}

type MarkedEpisode = EpisodeRef & {
  name: string;
  runtime: number | null;
};

export async function saveEpisode(
  userId: string,
  showId: number,
  seasonNumber: number,
  episodeNumber: number,
  intent: string,
  ratingRaw: FormDataEntryValue | null,
  noteRaw: FormDataEntryValue | null,
): Promise<Saved> {
  if (!isEpisodeIntent(intent)) {
    return { ok: false, error: "save" };
  }
  const rating = parseRatingField(ratingRaw);
  if (!rating.ok) {
    return { ok: false, error: "rating" };
  }
  const note = parseNoteField(noteRaw);
  if (!note.ok) {
    return { ok: false, error: "note" };
  }

  if (intent === "unwatch_season" || intent === "unwatch_later") {
    const supabase = await createClient();
    const query = supabase
      .from("episode_watches")
      .delete()
      .eq("user_id", userId)
      .eq("show_tmdb_id", showId);
    // "Later" clears this season and every one after it. Specials (season 0) stay.
    const removed =
      intent === "unwatch_season"
        ? await query.eq("season_number", seasonNumber)
        : await query.gte("season_number", Math.max(1, seasonNumber));
    return savedOr(removed.error);
  }

  if (intent === "unwatch") {
    const supabase = await createClient();
    const removed = await supabase
      .from("episode_watches")
      .delete()
      .eq("user_id", userId)
      .eq("show_tmdb_id", showId)
      .eq("season_number", seasonNumber)
      .eq("episode_number", episodeNumber);
    return savedOr(removed.error);
  }

  if (intent === "save") {
    return updateEpisodeDetails(
      userId,
      showId,
      seasonNumber,
      episodeNumber,
      rating.rating,
      note.note,
    );
  }

  const marked = await episodesForIntent(
    showId,
    seasonNumber,
    episodeNumber,
    intent,
  );
  if (!marked.ok) {
    return marked;
  }

  const ensured = await ensureWatchingShow(userId, showId);
  if (!ensured.ok) {
    return ensured;
  }

  const inserted = await insertNewWatches(userId, showId, marked.data);
  if (!inserted.ok) {
    return inserted;
  }

  if (intent === "season" || intent === "earlier") {
    return { ok: true, data: true };
  }

  return updateEpisodeDetails(
    userId,
    showId,
    seasonNumber,
    episodeNumber,
    rating.rating,
    note.note,
  );
}

async function updateEpisodeDetails(
  userId: string,
  showId: number,
  seasonNumber: number,
  episodeNumber: number,
  rating: number | null,
  note: string | null,
): Promise<Saved> {
  const supabase = await createClient();
  const updated = await supabase
    .from("episode_watches")
    .update({ rating, note })
    .eq("user_id", userId)
    .eq("show_tmdb_id", showId)
    .eq("season_number", seasonNumber)
    .eq("episode_number", episodeNumber)
    .select("episode_number");
  if (updated.error) {
    return { ok: false, error: libraryFailure(updated.error) };
  }
  if (updated.data.length === 0) {
    return { ok: false, error: "unwatched" };
  }
  return { ok: true, data: true };
}

async function episodesForIntent(
  showId: number,
  seasonNumber: number,
  episodeNumber: number,
  intent: "watch" | "season" | "earlier" | "upto",
): Promise<LibraryResult<MarkedEpisode[]>> {
  if (intent === "season") {
    return loadSeasonEpisodes(showId, seasonNumber, null);
  }
  if (intent === "earlier") {
    return loadThroughSeason(showId, seasonNumber);
  }
  if (intent === "watch") {
    const season = await loadSeasonEpisodes(showId, seasonNumber, episodeNumber);
    if (!season.ok) {
      return season;
    }
    if (season.data.length === 0) {
      return { ok: false, error: "missing" };
    }
    return season;
  }

  if (seasonNumber === 0) {
    return loadSeasonEpisodes(showId, 0, episodeNumber);
  }

  const show = await getTvShow(showId);
  if (!show.ok) {
    return { ok: false, error: show.error.kind === "not_found" ? "missing" : "save" };
  }

  const collected: MarkedEpisode[] = [];
  for (const season of show.data.seasons) {
    if (season.seasonNumber === 0 || season.seasonNumber > seasonNumber) {
      continue;
    }
    const loaded = await loadSeasonEpisodes(
      showId,
      season.seasonNumber,
      season.seasonNumber === seasonNumber ? episodeNumber : null,
    );
    if (!loaded.ok) {
      return loaded;
    }
    collected.push(...loaded.data);
  }

  const chosen = episodesUpTo(collected, { seasonNumber, episodeNumber });
  const byKey = new Map(collected.map((episode) => [episodeKey(episode), episode]));
  const marked = chosen.flatMap((episode) => {
    const full = byKey.get(episodeKey(episode));
    return full ? [full] : [];
  });
  if (
    !marked.some(
      (episode) =>
        episode.seasonNumber === seasonNumber &&
        episode.episodeNumber === episodeNumber,
    )
  ) {
    return { ok: false, error: "missing" };
  }
  return { ok: true, data: marked };
}

async function loadThroughSeason(
  showId: number,
  seasonNumber: number,
): Promise<LibraryResult<MarkedEpisode[]>> {
  const show = await getTvShow(showId);
  if (!show.ok) {
    return { ok: false, error: show.error.kind === "not_found" ? "missing" : "save" };
  }
  const collected: MarkedEpisode[] = [];
  for (const season of show.data.seasons) {
    if (season.seasonNumber === 0 || season.seasonNumber > seasonNumber) {
      continue;
    }
    const loaded = await loadSeasonEpisodes(showId, season.seasonNumber, null);
    if (!loaded.ok) {
      return loaded;
    }
    collected.push(...loaded.data);
  }
  if (collected.length === 0) {
    return { ok: false, error: "missing" };
  }
  return { ok: true, data: collected };
}

async function loadSeasonEpisodes(
  showId: number,
  seasonNumber: number,
  throughEpisode: number | null,
): Promise<LibraryResult<MarkedEpisode[]>> {
  const season = await getTvSeason(showId, seasonNumber);
  if (!season.ok) {
    return {
      ok: false,
      error: season.error.kind === "not_found" ? "missing" : "save",
    };
  }
  const episodes = season.data.episodes.filter((episode) =>
    throughEpisode === null ? true : episode.episodeNumber <= throughEpisode,
  );
  if (throughEpisode !== null && !episodes.some((episode) => episode.episodeNumber === throughEpisode)) {
    return { ok: true, data: [] };
  }
  return {
    ok: true,
    data: episodes.map((episode) => toMarked(seasonNumber, episode)),
  };
}

function toMarked(seasonNumber: number, episode: Episode): MarkedEpisode {
  return {
    seasonNumber,
    episodeNumber: episode.episodeNumber,
    name: episode.name.slice(0, 300),
    runtime: episode.runtime,
  };
}

async function ensureWatchingShow(userId: string, showId: number): Promise<Saved> {
  const supabase = await createClient();
  const existing = await supabase
    .from("tracked_shows")
    .select("tmdb_id")
    .eq("user_id", userId)
    .eq("tmdb_id", showId)
    .maybeSingle();
  if (existing.error) {
    return { ok: false, error: libraryFailure(existing.error) };
  }
  if (existing.data) {
    return { ok: true, data: true };
  }
  return saveShowStatus(userId, showId, "watching");
}

export type MarkAllResult =
  | { ok: true; marked: number }
  | { ok: false; busy: boolean; error: LibraryCode };

/**
 * Marks every episode that has aired (specials left out) as watched.
 * `watchedOn` (YYYY-MM-DD) dates the watches, so imports do not all land on today.
 * Returns busy when TMDB is pacing requests; the caller can try again later.
 */
export async function markAllAiredEpisodes(
  userId: string,
  showId: number,
  watchedOn: string | null,
): Promise<MarkAllResult> {
  const today = isoDateUTC(new Date());
  const show = await getTvShow(showId);
  if (!show.ok) {
    return {
      ok: false,
      busy: show.error.kind === "rate_limit",
      error: show.error.kind === "not_found" ? "missing" : "save",
    };
  }
  const collected: MarkedEpisode[] = [];
  for (const season of show.data.seasons) {
    if (season.seasonNumber === 0 || (season.airDate !== null && season.airDate > today)) {
      continue;
    }
    const loaded = await getTvSeason(showId, season.seasonNumber);
    if (!loaded.ok) {
      if (loaded.error.kind === "not_found") {
        continue;
      }
      return { ok: false, busy: loaded.error.kind === "rate_limit", error: "save" };
    }
    for (const episode of loaded.data.episodes) {
      if (episode.airDate !== null && episode.airDate <= today) {
        collected.push(toMarked(season.seasonNumber, episode));
      }
    }
  }
  if (collected.length === 0) {
    return { ok: true, marked: 0 };
  }
  const watchedAt = watchedOn && /^\d{4}-\d{2}-\d{2}$/.test(watchedOn) ? `${watchedOn}T12:00:00Z` : undefined;
  const inserted = await insertNewWatches(userId, showId, collected, watchedAt);
  if (!inserted.ok) {
    return { ok: false, busy: false, error: inserted.error };
  }
  return { ok: true, marked: collected.length };
}

async function insertNewWatches(
  userId: string,
  showId: number,
  episodes: MarkedEpisode[],
  watchedAt?: string,
): Promise<Saved> {
  const supabase = await createClient();
  const existing = await selectAllPages((from, to) =>
    supabase
      .from("episode_watches")
      .select("season_number, episode_number")
      .eq("user_id", userId)
      .eq("show_tmdb_id", showId)
      .order("season_number")
      .order("episode_number")
      .range(from, to),
  );
  if (existing.error) {
    return { ok: false, error: libraryFailure(existing.error) };
  }
  const seen = new Set(
    existing.data.map((row) =>
      episodeKey({
        seasonNumber: row.season_number,
        episodeNumber: row.episode_number,
      }),
    ),
  );
  const fresh = episodes.filter((episode) => !seen.has(episodeKey(episode)));
  if (fresh.length === 0) {
    return { ok: true, data: true };
  }
  const inserted = await supabase.from("episode_watches").insert(
    fresh.map((episode) => ({
      user_id: userId,
      show_tmdb_id: showId,
      season_number: episode.seasonNumber,
      episode_number: episode.episodeNumber,
      name: episode.name,
      runtime_minutes: episode.runtime,
      ...(watchedAt ? { watched_at: watchedAt } : {}),
    })),
  );
  return savedOr(inserted.error);
}
