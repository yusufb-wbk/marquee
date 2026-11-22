"use client";

import { useState, type FormEvent } from "react";

import { CollapsibleText } from "@/components/collapsible-text";
import { EpisodeActions } from "@/components/episode-actions";
import { formatAirDate, formatRuntime } from "@/lib/format";
import { episodeOverview } from "@/lib/overview";
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
    value === "season" ||
    value === "earlier" ||
    value === "unwatch_season" ||
    value === "unwatch_later"
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
  today,
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
  today: string;
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
  const laterWatched = [...watchedKeys].some(
    (key) => Number(key.split(":")[0]) > seasonNumber,
  );

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
    if (!intent.startsWith("unwatch") && !showTracked) {
      publishShowStatus("watching");
      onTracked();
    }
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="font-display text-2xl">{seasonName}</h2>
          <p className="text-sm text-muted">
            {complete
              ? "Season complete"
              : `${watchedCount} of ${episodes.length} watched`}
          </p>
        </div>
        {episodes.length > 0 ? (
          <SeasonWatch
            csrf={csrf}
            showId={showId}
            seasonNumber={seasonNumber}
            episodeNumber={episodes[0]?.episodeNumber ?? 1}
            nextPath={nextPath}
            complete={complete}
            watchedCount={watchedCount}
            laterWatched={laterWatched}
            pending={pendingKey === "season"}
            pendingIntent={pendingKey === "season" ? pendingIntent : null}
            onSubmit={(event) => {
              void onSubmit(event, "season");
            }}
          />
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
              {episode.overview.trim().length > 0 ? (
                <CollapsibleText
                  text={episode.overview}
                  className="text-sm leading-6 text-muted"
                />
              ) : (
                <p className="text-sm leading-6 text-muted">
                  {episodeOverview("", episode.airDate, today)}
                </p>
              )}
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

function SeasonWatch({
  csrf,
  showId,
  seasonNumber,
  episodeNumber,
  nextPath,
  complete,
  watchedCount,
  laterWatched,
  pending,
  pendingIntent,
  onSubmit,
}: {
  csrf: string;
  showId: number;
  seasonNumber: number;
  episodeNumber: number;
  nextPath: string;
  complete: boolean;
  watchedCount: number;
  laterWatched: boolean;
  pending: boolean;
  pendingIntent: WatchIntent | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [unmarking, setUnmarking] = useState(false);
  const unmarkPending = pendingIntent === "unwatch_season" || pendingIntent === "unwatch_later";
  const earlier = seasonNumber > 1;
  const choice =
    "inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold disabled:opacity-60";

  return (
    <form
      action="/library/episode"
      method="post"
      className="grid w-full gap-2 sm:w-auto"
      onSubmit={(event) => {
        setUnmarking(false);
        onSubmit(event);
      }}
    >
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="showId" value={showId} />
      <input type="hidden" name="season" value={seasonNumber} />
      <input type="hidden" name="episode" value={episodeNumber} />
      <input type="hidden" name="next" value={nextPath} />
      {complete ? (
        <button
          type="button"
          disabled
          className="inline-flex h-11 w-full items-center justify-center rounded-full border border-line px-4 text-sm font-semibold opacity-60 sm:w-auto"
        >
          Season watched
        </button>
      ) : open && earlier ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="submit"
            name="intent"
            value="season"
            disabled={pending}
            className={`${choice} bg-accent text-accent-ink`}
          >
            {pending && !unmarkPending ? "Saving…" : "This season"}
          </button>
          <button
            type="submit"
            name="intent"
            value="earlier"
            disabled={pending}
            className={`${choice} border border-line`}
          >
            {pending && !unmarkPending ? "Saving…" : "Earlier seasons too"}
          </button>
        </div>
      ) : (
        <button
          type={earlier ? "button" : "submit"}
          name={earlier ? undefined : "intent"}
          value={earlier ? undefined : "season"}
          disabled={pending}
          onClick={
            earlier
              ? () => {
                  setOpen(true);
                }
              : undefined
          }
          className="inline-flex h-11 w-full items-center justify-center rounded-full border border-line px-4 text-sm font-semibold disabled:opacity-60 sm:w-auto"
        >
          {pending && !unmarkPending ? "Saving…" : "Mark season watched"}
        </button>
      )}
      {watchedCount > 0 || laterWatched ? (
        unmarking ? (
          <div className="grid gap-2 rounded-2xl border border-line p-2">
            <p className="px-2 pt-1 text-xs text-muted">
              Unmark watched episodes. Their ratings and notes are removed too.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {watchedCount > 0 ? (
                <button
                  type="submit"
                  name="intent"
                  value="unwatch_season"
                  disabled={pending}
                  className={`${choice} border border-danger/50 text-danger`}
                >
                  This season
                </button>
              ) : null}
              {laterWatched ? (
                <button
                  type="submit"
                  name="intent"
                  value="unwatch_later"
                  disabled={pending}
                  className={`${choice} border border-danger/50 text-danger`}
                >
                  This and later seasons
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setUnmarking(false);
              }}
              className={`${choice} text-muted`}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setUnmarking(true);
            }}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-sm text-muted hover:text-foreground disabled:opacity-60"
          >
            {unmarkPending ? "Unmarking…" : "Unmark…"}
          </button>
        )
      ) : null}
    </form>
  );
}
