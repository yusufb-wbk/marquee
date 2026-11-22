import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { after } from "next/server";

import { mapWithLimit } from "@/lib/concurrency";
import type { Database } from "@/lib/library/database";
import { episodeKey, type EpisodeRef } from "@/lib/progress";
import {
  isScheduleFresh,
  nextFromSchedule,
  parseStoredSeasons,
  seasonsToStore,
  type NextLookup,
  type StoredSeason,
} from "@/lib/schedule";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getTvSeason, getTvShow } from "@/lib/tmdb/client";

export type { NextLookup, QueuedEpisode } from "@/lib/schedule";

/** TMDB lookups at a time, so a long list does not fire hundreds of requests at once. */
const TMDB_CONCURRENCY = 8;

type Saved = { seasons: StoredSeason[]; showStatus: string | null; refreshedAt: string };
type Built = { next: NextLookup; seasons: StoredSeason[]; showStatus: string | null };

/**
 * Your next episode for each show. Uses the schedules saved in Supabase, and asks TMDB
 * only for shows with no usable schedule. Stale schedules are used as they are and
 * refreshed after the response is sent, so the page never waits on them.
 */
export async function nextEpisodesFor(
  userId: string,
  shows: readonly { tmdbId: number; watched: ReadonlySet<string> }[],
  /** From prefetchSchedules, to read schedules while the library loads. */
  prefetched?: Promise<SavedSchedules>,
): Promise<{ next: NextLookup[]; stats: ScheduleStats }> {
  const { supabase, saved } = await (prefetched ??
    prefetchSchedules(userId, shows.map((show) => show.tmdbId)));
  const now = Date.now();

  const results = new Array<NextLookup>(shows.length);
  const fetchNow: number[] = [];
  const refreshLater: number[] = [];
  shows.forEach((show, index) => {
    const schedule = saved?.get(show.tmdbId);
    const next = schedule ? nextFromSchedule(schedule.seasons, show.watched) : "miss";
    if (!schedule || next === "miss") {
      fetchNow.push(index);
      return;
    }
    results[index] = next;
    if (!isScheduleFresh(schedule.refreshedAt, schedule.showStatus, now)) {
      refreshLater.push(index);
    }
  });

  const toSave: { tmdbId: number; built: Built }[] = [];
  await mapWithLimit(fetchNow, TMDB_CONCURRENCY, async (index) => {
    const show = shows[index]!;
    const built = await buildFromTmdb(show.tmdbId, show.watched);
    results[index] = built.next;
    if (built.next.state !== "error") {
      toSave.push({ tmdbId: show.tmdbId, built });
    }
  });

  // Saving needs the table; without it (saved === null) Up next still works from TMDB.
  if (supabase && saved !== null && (toSave.length > 0 || refreshLater.length > 0)) {
    after(async () => {
      const refreshed = await mapWithLimit(refreshLater, TMDB_CONCURRENCY, async (index) => {
        const show = shows[index]!;
        return { tmdbId: show.tmdbId, built: await buildFromTmdb(show.tmdbId, show.watched) };
      });
      const rows = [...toSave, ...refreshed.filter((item) => item.built.next.state !== "error")];
      await saveSchedules(supabase, userId, rows);
    });
  }

  return {
    next: results,
    stats: { saved: shows.length - fetchNow.length, fetched: fetchNow.length, stale: refreshLater.length },
  };
}

export type SavedSchedules = {
  supabase: SupabaseClient<Database> | null;
  /** null when the table is missing or the read failed. */
  saved: Map<number, Saved> | null;
};

/**
 * Starts reading saved schedules. Without `ids` it reads every schedule you have,
 * so it can run before the library is loaded.
 */
export async function prefetchSchedules(userId: string, ids?: number[]): Promise<SavedSchedules> {
  const supabase = await snapshotClient();
  return { supabase, saved: supabase ? await loadSchedules(supabase, userId, ids) : null };
}

export type ScheduleStats = { saved: number; fetched: number; stale: number };

/** Next episode for one show, for example right after you mark an episode. */
export async function lookupNextEpisode(
  userId: string,
  showId: number,
  watched: ReadonlySet<string>,
): Promise<NextLookup> {
  const { next } = await nextEpisodesFor(userId, [{ tmdbId: showId, watched }]);
  return next[0]!;
}

/** Loads the show and every season you still need, and works out the next episode. */
async function buildFromTmdb(showId: number, watched: ReadonlySet<string>): Promise<Built> {
  const show = await getTvShow(showId);
  if (!show.ok) {
    return { next: { state: "error", message: show.error.message }, seasons: [], showStatus: null };
  }
  const regular = show.data.seasons.filter((season) => season.seasonNumber > 0);
  const needed = seasonsToStore(regular, watched);
  const loaded = await Promise.all(needed.map((number) => getTvSeason(showId, number)));
  const episodesBySeason = new Map<number, StoredSeason["episodes"]>();
  for (const [index, season] of loaded.entries()) {
    if (!season.ok) {
      return { next: { state: "error", message: season.error.message }, seasons: [], showStatus: null };
    }
    episodesBySeason.set(
      needed[index]!,
      season.data.episodes.map((episode) => [episode.episodeNumber, episode.name, episode.airDate]),
    );
  }
  const seasons: StoredSeason[] = regular.map((season) => {
    const episodes = episodesBySeason.get(season.seasonNumber);
    return episodes
      ? { n: season.seasonNumber, count: season.episodeCount, episodes }
      : { n: season.seasonNumber, count: season.episodeCount };
  });
  const next = nextFromSchedule(seasons, watched);
  return {
    // Cannot miss: every season from the first unfinished one has its episodes.
    next: next === "miss" ? { state: "caught_up" } : next,
    seasons,
    showStatus: show.data.status,
  };
}

/** null when the table is missing or the read failed: Up next then falls back to TMDB. */
async function loadSchedules(
  supabase: SupabaseClient<Database>,
  userId: string,
  ids?: number[],
): Promise<Map<number, Saved> | null> {
  if (ids?.length === 0) {
    return new Map();
  }
  let query = supabase
    .from("show_schedules")
    .select("tmdb_id, seasons, show_status, refreshed_at")
    .eq("user_id", userId);
  if (ids) {
    query = query.in("tmdb_id", ids);
  }
  const { data, error } = await query;
  if (error) {
    console.warn(`Saved schedules could not be read: ${error.message}`);
    return null;
  }
  const map = new Map<number, Saved>();
  for (const row of data) {
    const seasons = parseStoredSeasons(row.seasons);
    if (seasons) {
      map.set(row.tmdb_id, { seasons, showStatus: row.show_status, refreshedAt: row.refreshed_at });
    }
  }
  return map;
}

async function saveSchedules(
  supabase: SupabaseClient<Database>,
  userId: string,
  rows: { tmdbId: number; built: Built }[],
): Promise<void> {
  if (rows.length === 0) {
    return;
  }
  const refreshedAt = new Date().toISOString();
  const { error } = await supabase.from("show_schedules").upsert(
    rows.map(({ tmdbId, built }) => ({
      user_id: userId,
      tmdb_id: tmdbId,
      seasons: built.seasons,
      show_status: built.showStatus,
      refreshed_at: refreshedAt,
    })),
  );
  if (error) {
    console.warn(`Saved schedules could not be written: ${error.message}`);
  }
}

/**
 * A Supabase client that reads a copy of this request's cookies. Server Components
 * cannot call cookies() inside after(), so the save after the response uses this copy.
 */
async function snapshotClient(): Promise<SupabaseClient<Database> | null> {
  const env = getSupabaseEnv();
  if (!env) {
    return null;
  }
  const snapshot = (await cookies()).getAll();
  return createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll: () => snapshot,
      setAll: () => {
        // The proxy refreshes session cookies; this copy never writes them.
      },
    },
  });
}

export function watchedKeys(episodes: readonly EpisodeRef[]): Set<string> {
  return new Set(episodes.map((episode) => episodeKey(episode)));
}
