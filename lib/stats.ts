export type GenreCount = {
  name: string;
  count: number;
};

export type WatchStats = {
  episodeCount: number;
  movieCount: number;
  minutes: number;
  episodesMissingRuntime: number;
  moviesMissingRuntime: number;
  topGenres: GenreCount[];
};

export function summarizeWatching(input: {
  shows: {
    genres: readonly string[];
    episodes: readonly { runtimeMinutes: number | null }[];
  }[];
  movies: readonly {
    genres: readonly string[];
    runtimeMinutes: number | null;
  }[];
}): WatchStats {
  const genreCounts = new Map<string, number>();
  const addGenres = (genres: readonly string[]) => {
    const seen = new Set<string>();
    for (const genre of genres) {
      const name = genre.trim();
      if (name.length === 0 || seen.has(name)) {
        continue;
      }
      seen.add(name);
      genreCounts.set(name, (genreCounts.get(name) ?? 0) + 1);
    }
  };

  let episodeCount = 0;
  let minutes = 0;
  let episodesMissingRuntime = 0;
  for (const show of input.shows) {
    if (show.episodes.length === 0) {
      continue;
    }
    addGenres(show.genres);
    for (const episode of show.episodes) {
      episodeCount += 1;
      if (episode.runtimeMinutes === null || episode.runtimeMinutes <= 0) {
        episodesMissingRuntime += 1;
      } else {
        minutes += episode.runtimeMinutes;
      }
    }
  }

  let movieCount = 0;
  let moviesMissingRuntime = 0;
  for (const movie of input.movies) {
    movieCount += 1;
    addGenres(movie.genres);
    if (movie.runtimeMinutes === null || movie.runtimeMinutes <= 0) {
      moviesMissingRuntime += 1;
    } else {
      minutes += movie.runtimeMinutes;
    }
  }

  const topGenres = [...genreCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5);

  return {
    episodeCount,
    movieCount,
    minutes,
    episodesMissingRuntime,
    moviesMissingRuntime,
    topGenres,
  };
}

export function formatHours(minutes: number): string {
  const hours = minutes / 60;
  if (hours === 0) {
    return "0";
  }
  if (hours < 10) {
    return hours.toFixed(1);
  }
  return Math.round(hours).toString();
}
