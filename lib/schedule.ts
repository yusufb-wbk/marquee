/**
 * A show's episode schedule, as saved in Supabase for Up next.
 * Pure functions only, so the rules can be tested without the database or TMDB.
 */

/** [episode number, name, air date]. Short, because a row holds every season you still need. */
export type StoredEpisode = [number, string, string | null];

export type StoredSeason = {
  /** Season number. Specials (0) are never stored. */
  n: number;
  /** Episode count from the show's season list. */
  count: number;
  /** Episodes, saved only from your first unfinished season onwards. */
  episodes?: StoredEpisode[];
};

export type QueuedEpisode = {
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  airDate: string | null;
};

export type NextLookup =
  | { state: "ready"; episode: QueuedEpisode }
  | { state: "caught_up" }
  | { state: "error"; message: string };

const HOUR = 60 * 60 * 1000;
/** A show still on air can add episodes or move air dates at any time. */
const AIRING_MAX_AGE = 12 * HOUR;
/** An ended show rarely changes. */
const ENDED_MAX_AGE = 30 * 24 * HOUR;

export function isScheduleFresh(refreshedAt: string, showStatus: string | null, now: number): boolean {
  const saved = Date.parse(refreshedAt);
  if (Number.isNaN(saved)) {
    return false;
  }
  const ended = showStatus === "Ended" || showStatus === "Canceled";
  return now - saved < (ended ? ENDED_MAX_AGE : AIRING_MAX_AGE);
}

function watchedIn(season: number, watched: ReadonlySet<string>): number {
  const prefix = `${season}:`;
  let total = 0;
  for (const key of watched) {
    if (key.startsWith(prefix)) {
      total += 1;
    }
  }
  return total;
}

function finished(season: StoredSeason, watched: ReadonlySet<string>): boolean {
  return season.count > 0 && watchedIn(season.n, watched) >= season.count;
}

/**
 * Your next episode from a saved schedule.
 * Returns "miss" when it needs a season that was not saved, for example after you
 * unmark an earlier season. The caller then loads the schedule again from TMDB.
 */
export function nextFromSchedule(
  seasons: readonly StoredSeason[],
  watched: ReadonlySet<string>,
): NextLookup | "miss" {
  for (const season of seasons) {
    if (season.n <= 0 || finished(season, watched)) {
      continue;
    }
    if (!season.episodes) {
      return "miss";
    }
    const next = season.episodes.find(
      // Same "season:episode" keys as episodeKey in lib/progress.ts.
      ([episodeNumber]) => !watched.has(`${season.n}:${episodeNumber}`),
    );
    if (next) {
      return {
        state: "ready",
        episode: { seasonNumber: season.n, episodeNumber: next[0], name: next[1], airDate: next[2] },
      };
    }
  }
  return { state: "caught_up" };
}

/** Season numbers whose episodes must be saved: your first unfinished season and every one after it. */
export function seasonsToStore(
  seasons: readonly { seasonNumber: number; episodeCount: number }[],
  watched: ReadonlySet<string>,
): number[] {
  const regular = seasons.filter((season) => season.seasonNumber > 0);
  const first = regular.findIndex(
    (season) => !finished({ n: season.seasonNumber, count: season.episodeCount }, watched),
  );
  return first === -1 ? [] : regular.slice(first).map((season) => season.seasonNumber);
}

/** Checks a saved `seasons` value before use. Anything unexpected counts as no schedule. */
export function parseStoredSeasons(value: unknown): StoredSeason[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const seasons: StoredSeason[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return null;
    }
    const { n, count, episodes } = item as Record<string, unknown>;
    if (!Number.isInteger(n) || !Number.isInteger(count)) {
      return null;
    }
    if (episodes === undefined) {
      seasons.push({ n: n as number, count: count as number });
      continue;
    }
    if (!Array.isArray(episodes) || !episodes.every(isStoredEpisode)) {
      return null;
    }
    seasons.push({ n: n as number, count: count as number, episodes });
  }
  return seasons;
}

function isStoredEpisode(value: unknown): value is StoredEpisode {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    Number.isInteger(value[0]) &&
    typeof value[1] === "string" &&
    (value[2] === null || typeof value[2] === "string")
  );
}
