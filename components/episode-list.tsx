import { formatAirDate, formatRuntime } from "@/lib/format";
import type { Episode } from "@/lib/tmdb/types";

export function EpisodeList({ episodes }: { episodes: Episode[] }) {
  if (episodes.length === 0) {
    return (
      <p className="text-muted">This season has no episodes listed yet.</p>
    );
  }

  return (
    <ol className="grid">
      {episodes.map((episode) => {
        const aired = formatAirDate(episode.airDate);
        const runtime = formatRuntime(episode.runtime);
        return (
          <li
            key={episode.id}
            className="grid gap-1 border-b border-line py-4 last:border-b-0"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-sm font-semibold tabular-nums text-accent">
                {episode.episodeNumber}
              </span>
              <h3 className="text-base font-semibold">{episode.name}</h3>
              {aired ? <span className="text-sm text-muted">{aired}</span> : null}
              {runtime ? (
                <span className="text-sm text-muted">{runtime}</span>
              ) : null}
            </div>
            <p className="text-sm leading-6 text-muted">
              {episode.overview.length > 0
                ? episode.overview
                : "No summary from TMDB."}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
