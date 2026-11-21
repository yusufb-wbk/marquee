export type EpisodeRef = {
  seasonNumber: number;
  episodeNumber: number;
};

export function episodeKey(episode: EpisodeRef): string {
  return `${episode.seasonNumber}:${episode.episodeNumber}`;
}

function byAirOrder(a: EpisodeRef, b: EpisodeRef): number {
  if (a.seasonNumber !== b.seasonNumber) {
    return a.seasonNumber - b.seasonNumber;
  }
  return a.episodeNumber - b.episodeNumber;
}

export function regularEpisodes(episodes: readonly EpisodeRef[]): EpisodeRef[] {
  return episodes
    .filter((episode) => episode.seasonNumber > 0)
    .slice()
    .sort(byAirOrder);
}

/** Next regular episode that is not watched. Specials (season 0) are skipped. */
export function nextEpisode(
  episodes: readonly EpisodeRef[],
  watched: ReadonlySet<string>,
): EpisodeRef | null {
  return (
    regularEpisodes(episodes).find(
      (episode) => !watched.has(episodeKey(episode)),
    ) ?? null
  );
}

/** True when the season lists at least one episode and every one is watched. */
export function isSeasonComplete(
  seasonNumber: number,
  episodes: readonly EpisodeRef[],
  watched: ReadonlySet<string>,
): boolean {
  const inSeason = episodes.filter(
    (episode) => episode.seasonNumber === seasonNumber,
  );
  if (inSeason.length === 0) {
    return false;
  }
  return inSeason.every((episode) => watched.has(episodeKey(episode)));
}

/**
 * Episodes a "watched up to here" tap should mark.
 * A special marks only itself. A regular episode marks earlier regular
 * episodes, including earlier seasons, and stops at this episode.
 */
export type WatchIntent = "watch" | "unwatch" | "upto" | "season";

/** Local list update for a watch button. Earlier seasons stay as they are. */
export function applyWatchChange(
  watched: ReadonlySet<string>,
  intent: WatchIntent,
  target: EpisodeRef,
  seasonEpisodes: readonly EpisodeRef[],
): Set<string> {
  const next = new Set(watched);
  if (intent === "unwatch") {
    next.delete(episodeKey(target));
    return next;
  }
  if (intent === "watch") {
    next.add(episodeKey(target));
    return next;
  }
  const affected =
    intent === "season"
      ? seasonEpisodes.filter(
          (episode) => episode.seasonNumber === target.seasonNumber,
        )
      : episodesUpTo(seasonEpisodes, target);
  for (const episode of affected) {
    next.add(episodeKey(episode));
  }
  return next;
}

export function episodesUpTo(
  episodes: readonly EpisodeRef[],
  target: EpisodeRef,
): EpisodeRef[] {
  if (target.seasonNumber === 0) {
    const special = episodes.find(
      (episode) =>
        episode.seasonNumber === 0 &&
        episode.episodeNumber === target.episodeNumber,
    );
    return [special ?? target];
  }

  const prior = regularEpisodes(episodes).filter(
    (episode) =>
      episode.seasonNumber < target.seasonNumber ||
      (episode.seasonNumber === target.seasonNumber &&
        episode.episodeNumber <= target.episodeNumber),
  );
  const includesTarget = prior.some(
    (episode) =>
      episode.seasonNumber === target.seasonNumber &&
      episode.episodeNumber === target.episodeNumber,
  );
  if (!includesTarget) {
    return [...prior, target];
  }
  return prior;
}
