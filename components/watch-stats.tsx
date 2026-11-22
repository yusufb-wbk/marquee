import { InsightsView } from "@/components/insights-view";
import type { InsightEpisode, InsightMovie, InsightShow } from "@/lib/insights";

/** Trims the library to the fields Insights needs, then renders it on the client. */
export function WatchStats({
  shows,
  movies,
  episodes,
}: {
  shows: (InsightShow & Record<string, unknown>)[];
  movies: (InsightMovie & Record<string, unknown>)[];
  episodes: (InsightEpisode & Record<string, unknown>)[];
}) {
  return (
    <InsightsView
      shows={shows.map(({ tmdbId, title, status, year, genres, rating }) => ({
        tmdbId,
        title,
        status,
        year,
        genres,
        rating,
      }))}
      movies={movies.map(({ title, status, year, genres, runtimeMinutes, watchedOn, rating }) => ({
        title,
        status,
        year,
        genres,
        runtimeMinutes,
        watchedOn,
        rating,
      }))}
      episodes={episodes.map(({ showTmdbId, runtimeMinutes, watchedAt }) => ({
        showTmdbId,
        runtimeMinutes,
        watchedAt,
      }))}
    />
  );
}
