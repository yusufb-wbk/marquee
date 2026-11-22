"use client";

import { useState } from "react";

import { EpisodeBoard } from "@/components/episode-board";
import { PageSkeleton } from "@/components/page-skeleton";
import { episodeKey } from "@/lib/progress";
import type { Episode, SeasonSummary } from "@/lib/tmdb/types";

type WatchRef = {
  seasonNumber: number;
  episodeNumber: number;
};

function isEpisode(value: unknown): value is Episode {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const episode = value as Record<string, unknown>;
  return (
    typeof episode.id === "number" &&
    typeof episode.episodeNumber === "number" &&
    typeof episode.name === "string" &&
    typeof episode.overview === "string" &&
    (episode.airDate === null || typeof episode.airDate === "string") &&
    (episode.runtime === null || typeof episode.runtime === "number")
  );
}

function parseSeasonPayload(
  value: unknown,
): { name: string; episodes: Episode[]; watched: number[] } | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const body = value as Record<string, unknown>;
  if (body.ok !== true || typeof body.name !== "string" || !Array.isArray(body.episodes)) {
    return null;
  }
  if (!body.episodes.every(isEpisode)) {
    return null;
  }
  const watched = Array.isArray(body.watched)
    ? body.watched.filter((item): item is number => typeof item === "number")
    : [];
  return { name: body.name, episodes: body.episodes, watched };
}

function mergeSeason(
  watched: ReadonlySet<string>,
  seasonNumber: number,
  episodeNumbers: readonly number[],
): Set<string> {
  const next = new Set(
    [...watched].filter((key) => !key.startsWith(`${seasonNumber}:`)),
  );
  for (const episodeNumber of episodeNumbers) {
    next.add(episodeKey({ seasonNumber, episodeNumber }));
  }
  return next;
}

export function SeasonBrowser({
  csrf,
  showId,
  seasons,
  initialSeasonNumber,
  initialSeasonName,
  initialEpisodes,
  initialWatched,
  showTracked,
  today,
}: {
  csrf: string;
  showId: number;
  seasons: SeasonSummary[];
  initialSeasonNumber: number;
  initialSeasonName: string;
  initialEpisodes: Episode[];
  initialWatched: WatchRef[];
  showTracked: boolean;
  today: string;
}) {
  const [seasonNumber, setSeasonNumber] = useState(initialSeasonNumber);
  const [seasonName, setSeasonName] = useState(initialSeasonName);
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [watched, setWatched] = useState(
    () => new Set(initialWatched.map((episode) => episodeKey(episode))),
  );
  const [tracked, setTracked] = useState(showTracked);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const nextPath = `/tv/${showId}?season=${seasonNumber}`;

  async function openSeason(nextSeason: number) {
    if (nextSeason === seasonNumber || loading) {
      return;
    }
    setLoading(true);
    setNotice(null);
    let response: Response;
    try {
      response = await fetch(
        `/api/season?show=${showId}&season=${nextSeason}`,
        { headers: { accept: "application/json" }, credentials: "same-origin" },
      );
    } catch {
      setLoading(false);
      setNotice("That season could not be loaded.");
      return;
    }
    const payload: unknown = await response.json().catch(() => null);
    const season = parseSeasonPayload(payload);
    setLoading(false);
    if (!season) {
      setNotice("That season could not be loaded.");
      return;
    }
    setSeasonNumber(nextSeason);
    setSeasonName(season.name);
    setEpisodes(season.episodes);
    setWatched((current) => mergeSeason(current, nextSeason, season.watched));
    window.history.replaceState(null, "", `/tv/${showId}?season=${nextSeason}`);
  }

  return (
    <div className="grid gap-4">
      <nav aria-label="Seasons" className="flex gap-2 overflow-x-auto pb-1">
        {seasons.map((season) => {
          const selected = season.seasonNumber === seasonNumber;
          return (
            <a
              key={season.seasonNumber}
              href={`/tv/${showId}?season=${season.seasonNumber}`}
              aria-current={selected ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                void openSeason(season.seasonNumber);
              }}
              className={`inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium ${
                selected
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line bg-card text-foreground"
              }`}
            >
              {season.name}
            </a>
          );
        })}
      </nav>
      {loading ? <PageSkeleton kind="episodes" /> : null}
      {notice ? (
        <p role="alert" className="text-sm text-notice">
          {notice}
        </p>
      ) : null}
      <EpisodeBoard
        csrf={csrf}
        showId={showId}
        seasonNumber={seasonNumber}
        seasonName={seasonName}
        episodes={episodes}
        watchedKeys={watched}
        showTracked={tracked}
        nextPath={nextPath}
        today={today}
        onWatched={setWatched}
        onTracked={() => {
          setTracked(true);
        }}
      />
    </div>
  );
}
