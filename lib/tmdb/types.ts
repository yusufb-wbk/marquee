export const TMDB_ERROR_KINDS = [
  "missing_key",
  "offline",
  "unauthorized",
  "rate_limit",
  "unavailable",
  "not_found",
  "bad_response",
] as const;

export type TmdbErrorKind = (typeof TMDB_ERROR_KINDS)[number];

export type TmdbError = {
  kind: TmdbErrorKind;
  message: string;
};

export type TmdbResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: TmdbError };

export type MediaType = "movie" | "tv";

export type SearchTitle = {
  id: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
  overview: string;
  posterUrl: string | null;
};

export type SeasonSummary = {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
};

export type AiringEpisode = {
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  airDate: string | null;
};

export type TvShow = {
  id: number;
  name: string;
  year: string | null;
  overview: string;
  posterUrl: string | null;
  status: string | null;
  genres: string[];
  seasons: SeasonSummary[];
  nextEpisode: AiringEpisode | null;
};

export type Episode = {
  id: number;
  episodeNumber: number;
  name: string;
  overview: string;
  airDate: string | null;
  runtime: number | null;
};

export type TvSeason = {
  seasonNumber: number;
  name: string;
  episodes: Episode[];
};

export type Movie = {
  id: number;
  title: string;
  year: string | null;
  overview: string;
  posterUrl: string | null;
  runtime: number | null;
  status: string | null;
  genres: string[];
};
