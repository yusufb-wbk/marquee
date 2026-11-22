export type WatchedTitle = {
  kind: "movie" | "tv";
  id: number;
  title: string;
  year: string | null;
  posterUrl: string | null;
  genres: string[];
  rating: number | null;
  watchedOn: string | null;
  detail: string;
};

export type WatchedQuery = {
  kind: "all" | "movie" | "tv";
  genre: string;
  year: string;
  rating: "any" | "unrated" | "5" | "6" | "7" | "8" | "9";
  sort: "recent" | "rating" | "title" | "year";
  text: string;
};

type ShowInput = {
  tmdbId: number;
  title: string;
  year: string | null;
  posterUrl: string | null;
  genres: string[];
  rating: number | null;
};

type MovieInput = ShowInput & {
  status: string;
  watchedOn: string | null;
};

type EpisodeInput = {
  showTmdbId: number;
  watchedAt: string;
};

export function buildWatchedTitles(input: {
  shows: readonly ShowInput[];
  movies: readonly MovieInput[];
  episodes: readonly EpisodeInput[];
}): WatchedTitle[] {
  const episodesByShow = new Map<number, { count: number; watchedOn: string | null }>();
  for (const episode of input.episodes) {
    const current = episodesByShow.get(episode.showTmdbId) ?? {
      count: 0,
      watchedOn: null,
    };
    const watchedOn =
      current.watchedOn === null || episode.watchedAt > current.watchedOn
        ? episode.watchedAt
        : current.watchedOn;
    episodesByShow.set(episode.showTmdbId, {
      count: current.count + 1,
      watchedOn,
    });
  }

  const shows = input.shows.flatMap((show) => {
    const progress = episodesByShow.get(show.tmdbId);
    if (!progress || progress.count === 0) {
      return [];
    }
    const detail = progress.count === 1 ? "1 episode" : `${progress.count} episodes`;
    return [
      titleFrom(show, "tv", progress.watchedOn?.slice(0, 10) ?? null, detail),
    ];
  });

  const movies = input.movies.flatMap((movie) => {
    if (movie.status !== "watched") {
      return [];
    }
    return [titleFrom(movie, "movie", movie.watchedOn, "Movie")];
  });

  return [...shows, ...movies];
}

function titleFrom(
  source: ShowInput,
  kind: WatchedTitle["kind"],
  watchedOn: string | null,
  detail: string,
): WatchedTitle {
  return {
    kind,
    id: source.tmdbId,
    title: source.title,
    year: source.year,
    posterUrl: source.posterUrl,
    genres: source.genres,
    rating: source.rating,
    watchedOn,
    detail,
  };
}

export function filterWatched(
  titles: readonly WatchedTitle[],
  query: WatchedQuery,
): WatchedTitle[] {
  const text = query.text.trim().toLowerCase();
  const minimum = query.rating === "any" || query.rating === "unrated"
    ? null
    : Number(query.rating);

  return titles
    .filter((title) => {
      if (query.kind !== "all" && title.kind !== query.kind) {
        return false;
      }
      if (query.genre.length > 0 && !title.genres.includes(query.genre)) {
        return false;
      }
      if (query.year.length > 0 && title.year !== query.year) {
        return false;
      }
      if (query.rating === "unrated") {
        return title.rating === null;
      }
      if (minimum !== null) {
        const display = title.rating === null ? null : title.rating / 2;
        return display !== null && display >= minimum;
      }
      if (text.length === 0) {
        return true;
      }
      return title.title.toLowerCase().includes(text);
    })
    .filter((title) => text.length === 0 || title.title.toLowerCase().includes(text))
    .sort((left, right) => compareWatched(left, right, query.sort));
}

function compareWatched(
  left: WatchedTitle,
  right: WatchedTitle,
  sort: WatchedQuery["sort"],
): number {
  if (sort === "title") {
    return left.title.localeCompare(right.title);
  }
  if (sort === "year") {
    return (right.year ?? "").localeCompare(left.year ?? "");
  }
  if (sort === "rating") {
    return (right.rating ?? -1) - (left.rating ?? -1) || left.title.localeCompare(right.title);
  }
  return (right.watchedOn ?? "").localeCompare(left.watchedOn ?? "") || left.title.localeCompare(right.title);
}

export function groupByRating(
  titles: readonly WatchedTitle[],
): { label: string; titles: WatchedTitle[] }[] {
  const groups: { label: string; titles: WatchedTitle[] }[] = [];
  for (const title of titles) {
    const label = ratingHeading(title.rating);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.titles.push(title);
    } else {
      groups.push({ label, titles: [title] });
    }
  }
  return groups;
}

function ratingHeading(stored: number | null): string {
  const label = watchedRatingLabel(stored);
  return label === "No rating" ? "Not rated" : label;
}

export function watchedRatingLabel(stored: number | null): string {
  if (stored === null || !Number.isInteger(stored) || stored < 1 || stored > 20) {
    return "No rating";
  }
  const display = stored / 2;
  const label = Number.isInteger(display) ? String(display) : display.toFixed(1);
  return `${label}/10`;
}
