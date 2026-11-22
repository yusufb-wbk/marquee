/**
 * Insights built from the user's own library. Pure functions, no I/O.
 * Day-based numbers (streaks, months, weekdays) use the viewer's time zone.
 */

export type InsightShow = {
  tmdbId: number;
  title: string;
  status: string;
  year: string | null;
  genres: string[];
  rating: number | null;
};

export type InsightMovie = {
  title: string;
  status: string;
  year: string | null;
  genres: string[];
  runtimeMinutes: number | null;
  watchedOn: string | null;
  rating: number | null;
};

export type InsightEpisode = {
  showTmdbId: number;
  runtimeMinutes: number | null;
  watchedAt: string;
};

export type MonthBar = { key: string; label: string; minutes: number; items: number };
export type WeekdayBar = { label: string; minutes: number; items: number };
export type Ranked = { title: string; value: number; detail: string };
export type QuietShow = { tmdbId: number; title: string; lastWatched: string; daysAgo: number };

export type Insights = {
  totals: {
    minutes: number;
    episodes: number;
    movies: number;
    showsStarted: number;
    missingRuntime: number;
  };
  lately: {
    last30Minutes: number;
    previous30Minutes: number;
    currentStreak: number;
    longestStreak: number;
    activeDays: number;
  };
  months: MonthBar[];
  weekdays: WeekdayBar[];
  ratings: {
    count: number;
    average: number | null;
    buckets: number[];
    top: Ranked[];
    bestGenres: Ranked[];
  };
  topGenres: { name: string; count: number; share: number }[];
  topShows: Ranked[];
  quietShows: QuietShow[];
  backlog: {
    movies: number;
    shows: number;
    movieMinutes: number;
    weeksAtPace: number | null;
  };
  decades: { label: string; count: number }[];
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const QUIET_AFTER_DAYS = 45;

export function buildInsights(input: {
  shows: readonly InsightShow[];
  movies: readonly InsightMovie[];
  episodes: readonly InsightEpisode[];
  timeZone: string;
  now: Date;
}): Insights {
  const toDay = dayFormatter(input.timeZone);
  const today = toDay(input.now);
  const watchedMovies = input.movies.filter((movie) => movie.status === "watched");

  // One entry per watch, with a calendar day when we know it.
  const events: { day: string | null; minutes: number }[] = [
    ...input.episodes.map((episode) => ({
      day: toDay(new Date(episode.watchedAt)),
      minutes: positive(episode.runtimeMinutes),
    })),
    ...watchedMovies.map((movie) => ({
      day: readDay(movie.watchedOn),
      minutes: positive(movie.runtimeMinutes),
    })),
  ];

  const missingRuntime =
    input.episodes.filter((episode) => positive(episode.runtimeMinutes) === 0).length +
    watchedMovies.filter((movie) => positive(movie.runtimeMinutes) === 0).length;
  const totalMinutes = events.reduce((sum, event) => sum + event.minutes, 0);

  const episodesByShow = new Map<number, InsightEpisode[]>();
  for (const episode of input.episodes) {
    const list = episodesByShow.get(episode.showTmdbId) ?? [];
    list.push(episode);
    episodesByShow.set(episode.showTmdbId, list);
  }

  const dated = events.filter((event): event is { day: string; minutes: number } => event.day !== null);
  const activeDays = new Set(dated.map((event) => event.day));
  const minutesSince = (from: string, to: string) =>
    dated
      .filter((event) => event.day >= from && event.day <= to)
      .reduce((sum, event) => sum + event.minutes, 0);

  const last30From = addDays(today, -29);
  const previous30From = addDays(today, -59);
  const previous30To = addDays(today, -30);
  const last90Minutes = minutesSince(addDays(today, -89), today);

  const showById = new Map(input.shows.map((show) => [show.tmdbId, show]));
  const backlogMovies = input.movies.filter((movie) => movie.status === "watchlist");
  const backlogMinutes = backlogMovies.reduce((sum, movie) => sum + positive(movie.runtimeMinutes), 0);
  const perWeek = (last90Minutes / 90) * 7;

  return {
    totals: {
      minutes: totalMinutes,
      episodes: input.episodes.length,
      movies: watchedMovies.length,
      showsStarted: episodesByShow.size,
      missingRuntime,
    },
    lately: {
      last30Minutes: minutesSince(last30From, today),
      previous30Minutes: minutesSince(previous30From, previous30To),
      currentStreak: currentStreak(activeDays, today),
      longestStreak: longestStreak(activeDays),
      activeDays: activeDays.size,
    },
    months: lastMonths(dated, today, 12),
    weekdays: byWeekday(dated),
    ratings: summarizeRatings(input.shows, watchedMovies),
    topGenres: topGenres(input.shows, episodesByShow, watchedMovies),
    topShows: topShows(episodesByShow, showById),
    quietShows: quietShows(input.shows, episodesByShow, toDay, today),
    backlog: {
      movies: backlogMovies.length,
      shows: input.shows.filter((show) => show.status === "watchlist").length,
      movieMinutes: backlogMinutes,
      weeksAtPace: perWeek > 0 && backlogMinutes > 0 ? backlogMinutes / perWeek : null,
    },
    decades: decades(input.shows, episodesByShow, watchedMovies),
  };
}

function summarizeRatings(
  shows: readonly InsightShow[],
  movies: readonly InsightMovie[],
): Insights["ratings"] {
  const rated = [
    ...shows.filter((show) => show.rating !== null),
    ...movies.filter((movie) => movie.rating !== null),
  ] as { title: string; genres: string[]; rating: number; year: string | null }[];

  const buckets = Array.from({ length: 10 }, () => 0);
  let sum = 0;
  for (const title of rated) {
    const display = title.rating / 2;
    sum += display;
    const bucket = Math.min(10, Math.max(1, Math.ceil(display)));
    buckets[bucket - 1] += 1;
  }

  const top = [...rated]
    .sort((a, b) => b.rating - a.rating || a.title.localeCompare(b.title))
    .slice(0, 5)
    .map((title) => ({
      title: title.title,
      value: title.rating / 2,
      detail: title.year ?? "",
    }));

  const byGenre = new Map<string, { sum: number; count: number }>();
  for (const title of rated) {
    for (const genre of uniqueGenres(title.genres)) {
      const entry = byGenre.get(genre) ?? { sum: 0, count: 0 };
      entry.sum += title.rating / 2;
      entry.count += 1;
      byGenre.set(genre, entry);
    }
  }
  const bestGenres = [...byGenre.entries()]
    .filter(([, entry]) => entry.count >= 3)
    .map(([genre, entry]) => ({
      title: genre,
      value: entry.sum / entry.count,
      detail: `${entry.count} rated`,
    }))
    .sort((a, b) => b.value - a.value || a.title.localeCompare(b.title))
    .slice(0, 3);

  return {
    count: rated.length,
    average: rated.length > 0 ? sum / rated.length : null,
    buckets,
    top,
    bestGenres,
  };
}

function topGenres(
  shows: readonly InsightShow[],
  episodesByShow: Map<number, InsightEpisode[]>,
  movies: readonly InsightMovie[],
): Insights["topGenres"] {
  const counts = new Map<string, number>();
  const titles = [
    ...shows.filter((show) => episodesByShow.has(show.tmdbId)).map((show) => show.genres),
    ...movies.map((movie) => movie.genres),
  ];
  for (const genres of titles) {
    for (const genre of uniqueGenres(genres)) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  const total = titles.length;
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, share: total > 0 ? count / total : 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 6);
}

function topShows(
  episodesByShow: Map<number, InsightEpisode[]>,
  showById: Map<number, InsightShow>,
): Ranked[] {
  return [...episodesByShow.entries()]
    .flatMap(([id, episodes]) => {
      const show = showById.get(id);
      if (!show) {
        return [];
      }
      const minutes = episodes.reduce((sum, episode) => sum + positive(episode.runtimeMinutes), 0);
      return [
        {
          title: show.title,
          value: minutes,
          detail: episodes.length === 1 ? "1 episode" : `${episodes.length} episodes`,
          count: episodes.length,
        },
      ];
    })
    .sort((a, b) => b.value - a.value || b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, 5)
    .map(({ title, value, detail }) => ({ title, value, detail }));
}

function quietShows(
  shows: readonly InsightShow[],
  episodesByShow: Map<number, InsightEpisode[]>,
  toDay: (date: Date) => string,
  today: string,
): QuietShow[] {
  return shows
    .filter((show) => show.status === "watching")
    .flatMap((show) => {
      const episodes = episodesByShow.get(show.tmdbId);
      if (!episodes || episodes.length === 0) {
        return [];
      }
      const last = episodes.reduce((latest, episode) =>
        episode.watchedAt > latest.watchedAt ? episode : latest,
      );
      const lastWatched = toDay(new Date(last.watchedAt));
      const daysAgo = daysBetween(lastWatched, today);
      return daysAgo >= QUIET_AFTER_DAYS
        ? [{ tmdbId: show.tmdbId, title: show.title, lastWatched, daysAgo }]
        : [];
    })
    .sort((a, b) => b.daysAgo - a.daysAgo || a.title.localeCompare(b.title))
    .slice(0, 5);
}

function decades(
  shows: readonly InsightShow[],
  episodesByShow: Map<number, InsightEpisode[]>,
  movies: readonly InsightMovie[],
): Insights["decades"] {
  const counts = new Map<number, number>();
  const years = [
    ...shows.filter((show) => episodesByShow.has(show.tmdbId)).map((show) => show.year),
    ...movies.map((movie) => movie.year),
  ];
  for (const year of years) {
    const value = year ? Number.parseInt(year.slice(0, 4), 10) : Number.NaN;
    if (!Number.isFinite(value) || value < 1880) {
      continue;
    }
    const decade = Math.floor(value / 10) * 10;
    counts.set(decade, (counts.get(decade) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([decade, count]) => ({ label: `${decade}s`, count }));
}

function lastMonths(
  events: readonly { day: string; minutes: number }[],
  today: string,
  count: number,
): MonthBar[] {
  const [year, month] = today.split("-").map(Number) as [number, number];
  const bars: MonthBar[] = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    const date = new Date(Date.UTC(year, month - 1 - back, 1));
    const key = date.toISOString().slice(0, 7);
    bars.push({
      key,
      label: date.toLocaleString("en", { month: "short", timeZone: "UTC" }),
      minutes: 0,
      items: 0,
    });
  }
  const byKey = new Map(bars.map((bar) => [bar.key, bar]));
  for (const event of events) {
    const bar = byKey.get(event.day.slice(0, 7));
    if (bar) {
      bar.minutes += event.minutes;
      bar.items += 1;
    }
  }
  return bars;
}

function byWeekday(events: readonly { day: string; minutes: number }[]): WeekdayBar[] {
  const bars = WEEKDAYS.map((label) => ({ label, minutes: 0, items: 0 }));
  for (const event of events) {
    // getUTCDay: Sunday is 0. Shift so Monday is 0.
    const index = (new Date(`${event.day}T12:00:00Z`).getUTCDay() + 6) % 7;
    bars[index].minutes += event.minutes;
    bars[index].items += 1;
  }
  return bars;
}

export function currentStreak(days: ReadonlySet<string>, today: string): number {
  // A streak that ended yesterday is still alive today.
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(days: ReadonlySet<string>): number {
  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    run = previous !== null && addDays(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }
  return longest;
}

function dayFormatter(timeZone: string): (date: Date) => string {
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    format = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
  return (date) => (Number.isNaN(date.getTime()) ? "" : format.format(date));
}

function readDay(value: string | null): string | null {
  const match = value ? /^(\d{4}-\d{2}-\d{2})/.exec(value) : null;
  return match?.[1] ?? null;
}

export function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`);
  return Math.round(ms / 86_400_000);
}

function positive(value: number | null): number {
  return value !== null && value > 0 ? value : 0;
}

function uniqueGenres(genres: readonly string[]): string[] {
  return [...new Set(genres.map((genre) => genre.trim()).filter((genre) => genre.length > 0))];
}
