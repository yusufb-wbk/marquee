import "server-only";

import { episodeKey, type EpisodeRef } from "@/lib/progress";
import { getTvSeason, getTvShow } from "@/lib/tmdb/client";

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

export async function lookupNextEpisode(
  showId: number,
  watched: ReadonlySet<string>,
): Promise<NextLookup> {
  const show = await getTvShow(showId);
  if (!show.ok) {
    return { state: "error", message: show.error.message };
  }

  const seasons = show.data.seasons.filter((season) => season.seasonNumber > 0);
  for (const season of seasons) {
    const watchedInSeason = [...watched].filter((key) =>
      key.startsWith(`${season.seasonNumber}:`),
    ).length;
    if (season.episodeCount > 0 && watchedInSeason >= season.episodeCount) {
      continue;
    }

    const loaded = await getTvSeason(showId, season.seasonNumber);
    if (!loaded.ok) {
      return { state: "error", message: loaded.error.message };
    }

    const next = loaded.data.episodes.find(
      (episode) =>
        !watched.has(
          episodeKey({
            seasonNumber: season.seasonNumber,
            episodeNumber: episode.episodeNumber,
          }),
        ),
    );
    if (next) {
      return {
        state: "ready",
        episode: {
          seasonNumber: season.seasonNumber,
          episodeNumber: next.episodeNumber,
          name: next.name,
          airDate: next.airDate,
        },
      };
    }
  }

  return { state: "caught_up" };
}

export function watchedKeys(episodes: readonly EpisodeRef[]): Set<string> {
  return new Set(episodes.map((episode) => episodeKey(episode)));
}
