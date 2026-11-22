"use client";

import Image from "next/image";
import { useState } from "react";

import { EpisodeBoard } from "@/components/episode-board";
import { PageSkeleton } from "@/components/page-skeleton";
import { formatAirDate } from "@/lib/format";
import { episodeKey } from "@/lib/progress";
import type { Episode, SeasonSummary } from "@/lib/tmdb/types";

type WatchRef = {
  seasonNumber: number;
  episodeNumber: number;
  watchedAt?: string;
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
    (episode.runtime === null || typeof episode.runtime === "number") &&
    (episode.stillUrl === undefined || episode.stillUrl === null || typeof episode.stillUrl === "string") &&
    (episode.score === undefined || episode.score === null || typeof episode.score === "number")
  );
}

function parseSeasonPayload(
  value: unknown,
): {
  name: string;
  episodes: Episode[];
  watched: number[];
  watchedDates: Record<string, string>;
} | null {
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
  const watchedDates: Record<string, string> = {};
  if (typeof body.watchedDates === "object" && body.watchedDates !== null) {
    for (const [episode, date] of Object.entries(body.watchedDates as Record<string, unknown>)) {
      if (typeof date === "string") {
        watchedDates[episode] = date;
      }
    }
  }
  return { name: body.name, episodes: body.episodes, watched, watchedDates };
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
  startOpen = true,
}: {
  /** Open the first season's episodes on load; false starts with every card closed. */
  startOpen?: boolean;
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
  // The open season's episodes show under its card; null when all cards are closed.
  const [open, setOpen] = useState<number | null>(startOpen ? initialSeasonNumber : null);
  const [seasonName, setSeasonName] = useState(initialSeasonName);
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [watched, setWatched] = useState(
    () => new Set(initialWatched.map((episode) => episodeKey(episode))),
  );
  const [tracked, setTracked] = useState(showTracked);
  // When each watched episode was watched, by episode key.
  const [watchedDates, setWatchedDates] = useState<Record<string, string>>(() => {
    const dates: Record<string, string> = {};
    for (const episode of initialWatched) {
      if (episode.watchedAt) {
        dates[episodeKey(episode)] = episode.watchedAt;
      }
    }
    return dates;
  });

  /** Updates the watched set; newly marked episodes are dated today. */
  function changeWatched(next: Set<string>) {
    const now = new Date().toISOString();
    setWatchedDates((current) => {
      const dates = { ...current };
      for (const key of next) {
        if (!dates[key]) {
          dates[key] = now;
        }
      }
      for (const key of Object.keys(dates)) {
        if (!next.has(key)) {
          delete dates[key];
        }
      }
      return dates;
    });
    setWatched(next);
  }
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const nextPath = `/tv/${showId}?season=${seasonNumber}`;

  async function openSeason(nextSeason: number) {
    if (loading) {
      return;
    }
    if (nextSeason === seasonNumber) {
      // Tapping the open card closes it; tapping it again reopens without a fetch.
      setOpen((current) => (current === nextSeason ? null : nextSeason));
      return;
    }
    setOpen(nextSeason);
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
    setWatchedDates((current) => {
      const dates = { ...current };
      for (const [episode, date] of Object.entries(season.watchedDates)) {
        dates[`${nextSeason}:${episode}`] = date;
      }
      return dates;
    });
    window.history.replaceState(null, "", `/tv/${showId}?season=${nextSeason}`);
  }

  // Regular seasons in order, specials last.
  const ordered = [
    ...seasons.filter((season) => season.seasonNumber > 0),
    ...seasons.filter((season) => season.seasonNumber === 0),
  ];

  return (
    <section className="grid gap-3" aria-label="Seasons">
      <h2 className="font-display text-2xl">
        {ordered.filter((season) => season.seasonNumber > 0).length === 1
          ? "1 season"
          : `${ordered.filter((season) => season.seasonNumber > 0).length} seasons`}
      </h2>
      <ol className="grid gap-2">
        {ordered.map((season) => {
          const isOpen = open === season.seasonNumber;
          const watchedHere = [...watched].filter((key) =>
            key.startsWith(`${season.seasonNumber}:`),
          ).length;
          const total = season.episodeCount;
          const complete = total > 0 && watchedHere >= total;
          const percent = total > 0 ? Math.min(100, Math.round((watchedHere / total) * 100)) : 0;
          const aired = formatAirDate(season.airDate);
          return (
            <li key={season.seasonNumber} className="grid gap-3">
              <a
                href={`/tv/${showId}?season=${season.seasonNumber}`}
                aria-expanded={isOpen}
                onClick={(event) => {
                  event.preventDefault();
                  void openSeason(season.seasonNumber);
                }}
                className={`flex items-center gap-3 rounded-2xl border bg-card p-2.5 pr-4 transition-colors ${
                  isOpen ? "border-accent/60" : "border-line hover:border-muted/60"
                }`}
              >
                <span className="relative aspect-[2/3] w-14 shrink-0 overflow-hidden rounded-xl bg-background">
                  {season.posterUrl ? (
                    <Image src={season.posterUrl} alt="" fill sizes="56px" className="object-cover" />
                  ) : null}
                </span>
                <span className="grid min-w-0 flex-1 gap-1">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="truncate">{season.name}</span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                  <span className="text-xs text-muted">
                    {[aired, total > 0 ? `${watchedHere}/${total} episodes` : "No episodes yet"]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span aria-hidden="true" className="h-1.5 rounded-full bg-line">
                    <span
                      className={`block h-full rounded-full ${complete ? "bg-notice" : "bg-accent"}`}
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                </span>
                <span
                  aria-label={complete ? "Season watched" : `${watchedHere} of ${total} watched`}
                  className={`grid size-8 shrink-0 place-items-center rounded-full ${
                    complete ? "bg-notice text-background" : "border border-line text-muted"
                  }`}
                >
                  {complete ? (
                    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  ) : (
                    <span className="text-[0.65rem] font-semibold tabular-nums">{percent}%</span>
                  )}
                </span>
              </a>
              {isOpen ? (
                <div className="rounded-2xl border border-line/60 px-3 pb-1 pt-3 sm:px-4">
                  {loading || season.seasonNumber !== seasonNumber ? (
                    <PageSkeleton kind="episodes" />
                  ) : (
                    <EpisodeBoard
                      csrf={csrf}
                      showId={showId}
                      seasonNumber={seasonNumber}
                      seasonName={seasonName}
                      episodes={episodes}
                      watchedKeys={watched}
                      watchedDates={watchedDates}
                      showTracked={tracked}
                      nextPath={nextPath}
                      today={today}
                      onWatched={changeWatched}
                      onTracked={() => {
                        setTracked(true);
                      }}
                      compact
                    />
                  )}
                  {notice ? (
                    <p role="alert" className="pb-3 text-sm text-notice">
                      {notice}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
