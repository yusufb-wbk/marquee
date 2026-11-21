import { EpisodeActions } from "@/components/episode-actions";
import { formatAirDate, formatRuntime } from "@/lib/format";
import type { EpisodeWatch } from "@/lib/library/queries";
import { episodeKey, isSeasonComplete } from "@/lib/progress";
import type { Episode } from "@/lib/tmdb/types";

export function EpisodeBoard({
  showId,
  seasonNumber,
  seasonName,
  episodes,
  watches,
  nextPath,
}: {
  showId: number;
  seasonNumber: number;
  seasonName: string;
  episodes: Episode[];
  watches: EpisodeWatch[];
  nextPath: string;
}) {
  const watched = new Set(watches.map((watch) => episodeKey(watch)));
  const seasonEpisodes = episodes.map((episode) => ({
    seasonNumber,
    episodeNumber: episode.episodeNumber,
  }));
  const complete = isSeasonComplete(seasonNumber, seasonEpisodes, watched);
  const watchedCount = seasonEpisodes.filter((episode) =>
    watched.has(episodeKey(episode)),
  ).length;

  return (
    <section className="grid gap-4">
      <div className="grid gap-2">
        <h2 className="font-display text-2xl">{seasonName}</h2>
        <p className="text-sm text-muted">
          {complete
            ? "Season complete"
            : `${watchedCount} of ${episodes.length} watched`}
        </p>
        {episodes.length > 0 ? (
          <form action="/library/episode" method="post">
            <input type="hidden" name="showId" value={showId} />
            <input type="hidden" name="season" value={seasonNumber} />
            <input type="hidden" name="episode" value={episodes[0]?.episodeNumber ?? 1} />
            <input type="hidden" name="next" value={nextPath} />
            <button
              type="submit"
              name="intent"
              value="season"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold"
            >
              Mark season watched
            </button>
          </form>
        ) : (
          <p className="text-muted">This season has no episodes listed yet.</p>
        )}
      </div>
      <ol className="grid">
        {episodes.map((episode) => {
          const watch = watches.find(
            (item) =>
              item.seasonNumber === seasonNumber &&
              item.episodeNumber === episode.episodeNumber,
          );
          const aired = formatAirDate(episode.airDate);
          const runtime = formatRuntime(episode.runtime);
          return (
            <li
              key={episode.id}
              className="grid gap-3 border-b border-line py-4 last:border-b-0"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm font-semibold tabular-nums text-accent">
                  {episode.episodeNumber}
                </span>
                <h3 className="text-base font-semibold">{episode.name}</h3>
                {aired ? <span className="text-sm text-muted">{aired}</span> : null}
                {runtime ? <span className="text-sm text-muted">{runtime}</span> : null}
              </div>
              <p className="text-sm leading-6 text-muted">
                {episode.overview.length > 0
                  ? episode.overview
                  : "No summary from TMDB."}
              </p>
              <form action="/library/episode" method="post" className="grid gap-3">
                <input type="hidden" name="showId" value={showId} />
                <input type="hidden" name="season" value={seasonNumber} />
                <input type="hidden" name="episode" value={episode.episodeNumber} />
                <input type="hidden" name="next" value={nextPath} />
                <EpisodeActions watched={Boolean(watch)} />
              </form>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
