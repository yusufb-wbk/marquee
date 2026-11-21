"use client";

import { useState, type FormEvent } from "react";

import { EpisodeActions } from "@/components/episode-actions";
import { formatAirDate, formatRuntime } from "@/lib/format";
import { libraryNotice } from "@/lib/library/notices";
import { submitLibraryForm, submitterOf } from "@/lib/library/submit";
import {
  applyWatchChange,
  episodeKey,
  isSeasonComplete,
  type WatchIntent,
} from "@/lib/progress";
import { publishShowStatus } from "@/lib/show-status-bus";
import type { Episode } from "@/lib/tmdb/types";

function isWatchIntent(value: string): value is WatchIntent {
  return (
    value === "watch" ||
    value === "unwatch" ||
    value === "upto" ||
    value === "season"
  );
}

export function EpisodeBoard({
  csrf,
  showId,
  seasonNumber,
  seasonName,
  episodes,
  watchedKeys,
  showTracked,
  nextPath,
  onWatched,
  onTracked,
}: {
  csrf: string;
  showId: number;
  seasonNumber: number;
  seasonName: string;
  episodes: Episode[];
  watchedKeys: ReadonlySet<string>;
  showTracked: boolean;
  nextPath: string;
  onWatched: (watched: Set<string>) => void;
  onTracked: () => void;
}) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<WatchIntent | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const seasonEpisodes = episodes.map((episode) => ({
    seasonNumber,
    episodeNumber: episode.episodeNumber,
  }));
  const complete = isSeasonComplete(seasonNumber, seasonEpisodes, watchedKeys);
  const watchedCount = seasonEpisodes.filter((episode) =>
    watchedKeys.has(episodeKey(episode)),
  ).length;

  async function onSubmit(event: FormEvent<HTMLFormElement>, rowKey: string) {
    event.preventDefault();
    if (pendingKey) {
      return;
    }
    const submitter = submitterOf(event);
    const intent = submitter?.value ?? "";
    if (!isWatchIntent(intent)) {
      return;
    }
    const episodeNumber = Number(new FormData(event.currentTarget).get("episode"));
    if (!Number.isInteger(episodeNumber) || episodeNumber <= 0) {
      return;
    }
    const previous = new Set(watchedKeys);
    setPendingKey(rowKey);
    setPendingIntent(intent);
    setErrorKey(null);
    setErrorText(null);
    onWatched(
      applyWatchChange(previous, intent, { seasonNumber, episodeNumber }, seasonEpisodes),
    );
    const result = await submitLibraryForm(event.currentTarget, submitter);
    setPendingKey(null);
    setPendingIntent(null);
    if (!result.ok) {
      onWatched(previous);
      setErrorKey(rowKey);
      setErrorText(libraryNotice(result.error)?.title ?? "That change was not saved");
      return;
    }
    if (intent !== "unwatch" && !showTracked) {
      publishShowStatus("watching");
      onTracked();
    }
  }

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
          <form
            action="/library/episode"
            method="post"
            onSubmit={(event) => {
              void onSubmit(event, "season");
            }}
          >
            <input type="hidden" name="csrf" value={csrf} />
            <input type="hidden" name="showId" value={showId} />
            <input type="hidden" name="season" value={seasonNumber} />
            <input type="hidden" name="episode" value={episodes[0]?.episodeNumber ?? 1} />
            <input type="hidden" name="next" value={nextPath} />
            <button
              type="submit"
              name="intent"
              value="season"
              disabled={pendingKey !== null}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-60"
            >
              {pendingKey === "season" ? "Saving…" : "Mark season watched"}
            </button>
          </form>
        ) : (
          <p className="text-muted">This season has no episodes listed yet.</p>
        )}
        {errorKey === "season" && errorText ? (
          <p role="alert" className="text-sm text-notice">
            {errorText}
          </p>
        ) : null}
      </div>
      <ol className="grid">
        {episodes.map((episode) => {
          const rowKey = episodeKey({ seasonNumber, episodeNumber: episode.episodeNumber });
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
              <form
                action="/library/episode"
                method="post"
                className="grid gap-3"
                onSubmit={(event) => {
                  void onSubmit(event, rowKey);
                }}
              >
                <input type="hidden" name="csrf" value={csrf} />
                <input type="hidden" name="showId" value={showId} />
                <input type="hidden" name="season" value={seasonNumber} />
                <input type="hidden" name="episode" value={episode.episodeNumber} />
                <input type="hidden" name="next" value={nextPath} />
                <EpisodeActions
                  watched={watchedKeys.has(rowKey)}
                  pending={pendingKey === rowKey ? pendingIntent : null}
                />
              </form>
              {errorKey === rowKey && errorText ? (
                <p role="alert" className="text-sm text-notice">
                  {errorText}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
