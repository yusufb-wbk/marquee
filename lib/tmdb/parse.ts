import type {
  AiringEpisode,
  Episode,
  MediaType,
  Movie,
  SearchTitle,
  SeasonSummary,
  TvSeason,
  TvShow,
} from "@/lib/tmdb/types";

const POSTER_SIZE = "w342";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readId(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

function readCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return 0;
  }
  return value;
}

function readSeasonNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
}

function readRuntime(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

function readDate(value: unknown): string | null {
  const text = readText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function yearFromDate(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return value.slice(0, 4);
}

function readPosterPath(value: unknown): string | null {
  const text = readText(value);
  if (!text.startsWith("/") || text.includes("..") || text.includes("\\")) {
    return null;
  }
  return text;
}

function posterUrl(path: string | null): string | null {
  if (!path) {
    return null;
  }
  return `https://image.tmdb.org/t/p/${POSTER_SIZE}${path}`;
}

function readGenres(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const names: string[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }
    const name = readText(item.name);
    if (name.length > 0) {
      names.push(name);
    }
  }
  return names;
}

export function parseSearchResults(
  body: unknown,
  fallbackMediaType: MediaType | null = null,
): SearchTitle[] | null {
  if (!isRecord(body) || !Array.isArray(body.results)) {
    return null;
  }

  const titles: SearchTitle[] = [];
  for (const item of body.results) {
    const title = parseSearchTitle(item, fallbackMediaType);
    if (title) {
      titles.push(title);
    }
  }
  return titles;
}

function parseSearchTitle(
  value: unknown,
  fallbackMediaType: MediaType | null,
): SearchTitle | null {
  if (!isRecord(value)) {
    return null;
  }
  const mediaType =
    value.media_type === "movie" || value.media_type === "tv"
      ? value.media_type
      : fallbackMediaType;
  if (mediaType !== "movie" && mediaType !== "tv") {
    return null;
  }
  const id = readId(value.id);
  if (id === null) {
    return null;
  }
  const title =
    mediaType === "movie" ? readText(value.title) : readText(value.name);
  if (title.length === 0) {
    return null;
  }
  const date =
    mediaType === "movie"
      ? readDate(value.release_date)
      : readDate(value.first_air_date);

  return {
    id,
    mediaType,
    title,
    year: yearFromDate(date),
    overview: readText(value.overview),
    posterUrl: posterUrl(readPosterPath(value.poster_path)),
  };
}

export function parseTvShow(body: unknown): TvShow | null {
  if (!isRecord(body)) {
    return null;
  }
  const id = readId(body.id);
  const name = readText(body.name);
  if (id === null || name.length === 0 || !Array.isArray(body.seasons)) {
    return null;
  }

  const seasons: SeasonSummary[] = [];
  for (const item of body.seasons) {
    const season = parseSeasonSummary(item);
    if (season) {
      seasons.push(season);
    }
  }
  seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);

  const status = readText(body.status);

  return {
    id,
    name,
    year: yearFromDate(readDate(body.first_air_date)),
    overview: readText(body.overview),
    posterUrl: posterUrl(readPosterPath(body.poster_path)),
    status: status.length > 0 ? status : null,
    genres: readGenres(body.genres),
    seasons,
    nextEpisode: parseNextEpisode(body.next_episode_to_air),
  };
}

function parseNextEpisode(value: unknown): AiringEpisode | null {
  if (!isRecord(value)) {
    return null;
  }
  const seasonNumber = readSeasonNumber(value.season_number);
  const episodeNumber = readId(value.episode_number);
  if (seasonNumber === null || episodeNumber === null) {
    return null;
  }
  const name = readText(value.name);
  return {
    seasonNumber,
    episodeNumber,
    name: name.length > 0 ? name : `Episode ${episodeNumber}`,
    airDate: readDate(value.air_date),
  };
}

function parseSeasonSummary(value: unknown): SeasonSummary | null {
  if (!isRecord(value)) {
    return null;
  }
  const seasonNumber = readSeasonNumber(value.season_number);
  if (seasonNumber === null) {
    return null;
  }
  const name = readText(value.name);
  return {
    seasonNumber,
    name:
      name.length > 0
        ? name
        : seasonNumber === 0
          ? "Specials"
          : `Season ${seasonNumber}`,
    episodeCount: readCount(value.episode_count),
    airDate: readDate(value.air_date),
  };
}

export function parseTvSeason(
  body: unknown,
  seasonNumber: number,
): TvSeason | null {
  if (!isRecord(body) || !Array.isArray(body.episodes)) {
    return null;
  }
  const name = readText(body.name);
  const episodes: Episode[] = [];
  for (const item of body.episodes) {
    const episode = parseEpisode(item);
    if (episode) {
      episodes.push(episode);
    }
  }
  episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);

  return {
    seasonNumber,
    name:
      name.length > 0
        ? name
        : seasonNumber === 0
          ? "Specials"
          : `Season ${seasonNumber}`,
    episodes,
  };
}

function parseEpisode(value: unknown): Episode | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = readId(value.id);
  const episodeNumber = readId(value.episode_number);
  if (id === null || episodeNumber === null) {
    return null;
  }
  const name = readText(value.name);
  return {
    id,
    episodeNumber,
    name: name.length > 0 ? name : `Episode ${episodeNumber}`,
    overview: readText(value.overview),
    airDate: readDate(value.air_date),
    runtime: readRuntime(value.runtime),
  };
}

export function parseMovie(body: unknown): Movie | null {
  if (!isRecord(body)) {
    return null;
  }
  const id = readId(body.id);
  const title = readText(body.title);
  if (id === null || title.length === 0) {
    return null;
  }
  const status = readText(body.status);
  return {
    id,
    title,
    year: yearFromDate(readDate(body.release_date)),
    overview: readText(body.overview),
    posterUrl: posterUrl(readPosterPath(body.poster_path)),
    runtime: readRuntime(body.runtime),
    status: status.length > 0 ? status : null,
    genres: readGenres(body.genres),
  };
}

export type ImdbFind = {
  movieId: number | null;
  showId: number | null;
  episode: {
    showId: number;
    seasonNumber: number;
    episodeNumber: number;
    name: string;
    runtime: number | null;
  } | null;
};

function firstResultId(value: unknown): number | null {
  if (!Array.isArray(value) || !isRecord(value[0])) {
    return null;
  }
  return readId(value[0].id);
}

function firstEpisode(value: unknown): ImdbFind["episode"] {
  if (!Array.isArray(value) || !isRecord(value[0])) {
    return null;
  }
  const row = value[0];
  const showId = readId(row.show_id);
  const seasonNumber = readSeasonNumber(row.season_number);
  const episodeNumber = readId(row.episode_number);
  if (showId === null || seasonNumber === null || episodeNumber === null) {
    return null;
  }
  const name = readText(row.name);
  return {
    showId,
    seasonNumber,
    episodeNumber,
    name: name.length > 0 ? name.slice(0, 300) : `Episode ${episodeNumber}`,
    runtime: readRuntime(row.runtime),
  };
}

export function parseImdbFind(body: unknown): ImdbFind | null {
  if (!isRecord(body)) {
    return null;
  }
  return {
    movieId: firstResultId(body.movie_results),
    showId: firstResultId(body.tv_results),
    episode: firstEpisode(body.tv_episode_results),
  };
}
