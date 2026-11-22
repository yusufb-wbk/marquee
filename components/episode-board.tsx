"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

import { CheckIcon, StarIcon } from "@/components/icons";
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
  watchedDates = {},
  showTracked,
  nextPath,
  today,
  onWatched,
  onTracked,
  compact = false,
}: {
  /** When each watched episode was watched, by episode key. */
  watchedDates?: Readonly<Record<string, string>>;
  /** Inside a season card: the card shows the name and progress, so only the actions show here. */
  compact?: boolean;
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
        {compact ? null : (
          <div className="grid gap-1">
            <h2 className="font-display text-2xl">{seasonName}</h2>
            <p className="text-sm text-muted">
              {complete
                ? "Season complete"
                : `${watchedCount} of ${episodes.length} watched`}
            </p>
          </div>
        )}
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
          return (
            <EpisodeRow
              key={episode.id}
              csrf={csrf}
              showId={showId}
              seasonNumber={seasonNumber}
              episode={episode}
              watched={watchedKeys.has(rowKey)}
              watchedAt={watchedDates[rowKey] ?? null}
              nextPath={nextPath}
              today={today}
              pending={pendingKey === rowKey ? pendingIntent : null}
              error={errorKey === rowKey ? errorText : null}
              onSubmit={(event) => {
                void onSubmit(event, rowKey);
              }}
            />
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

/**
 * One episode as a compact row: a still, the title and facts, and a round check
 * that marks it watched or not in one tap. The ⋯ menu holds "Watched up to here"
 * and the summary.
 */
function EpisodeRow({
  csrf,
  showId,
  seasonNumber,
  episode,
  watched,
  watchedAt,
  nextPath,
  today,
  pending,
  error,
  onSubmit,
}: {
  csrf: string;
  showId: number;
  seasonNumber: number;
  episode: Episode;
  watched: boolean;
  watchedAt: string | null;
  nextPath: string;
  today: string;
  pending: WatchIntent | null;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [summary, setSummary] = useState(false);
  const aired = formatAirDate(episode.airDate);
  const runtime = formatRuntime(episode.runtime);
  const upcoming = episode.airDate !== null && episode.airDate > today;
  const busy = pending !== null;
  const label = `S${seasonNumber} E${episode.episodeNumber}`;
  const overview =
    episode.overview.trim().length > 0 ? episode.overview : episodeOverview("", episode.airDate, today);

  return (
    <li className="border-b border-line/70 py-3 last:border-b-0">
      <form
        action="/library/episode"
        method="post"
        onSubmit={(event) => {
          setMenu(false);
          onSubmit(event);
        }}
        className="grid gap-2"
      >
        <input type="hidden" name="csrf" value={csrf} />
        <input type="hidden" name="showId" value={showId} />
        <input type="hidden" name="season" value={seasonNumber} />
        <input type="hidden" name="episode" value={episode.episodeNumber} />
        <input type="hidden" name="next" value={nextPath} />
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setSummary((current) => !current)}
            aria-label={summary ? "Hide summary" : "Show summary"}
            className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-card sm:w-36"
          >
            {episode.stillUrl ? (
              <Image
                src={episode.stillUrl}
                alt=""
                fill
                sizes="144px"
                className={`object-cover ${upcoming ? "opacity-50" : ""}`}
              />
            ) : (
              <span className="grid h-full place-items-center text-xs font-semibold text-muted">{label}</span>
            )}
          </button>
          <div className="grid min-w-0 flex-1 gap-0.5">
            <p className="font-semibold leading-snug">
              <span className="tabular-nums text-accent">{label}</span>
              <span className="text-muted"> · </span>
              {episode.name}
            </p>
            {episode.score ? (
              <p className="flex items-center gap-1 text-sm font-semibold tabular-nums">
                <StarIcon className="h-3.5 w-3.5 text-accent" />
                {episode.score.toFixed(1)}
              </p>
            ) : null}
            <p className="text-xs text-muted">
              {[aired, runtime].filter(Boolean).join(" · ") || "Date not announced"}
            </p>
            {watched ? (
              <p className="flex items-center gap-1 text-xs font-medium text-notice">
                <CheckIcon className="h-3.5 w-3.5" />
                {/* The date is in the viewer's time zone, which can differ from the server's. */}
                <span suppressHydrationWarning>
                  {watchedAt ? `Watched ${formatWatched(watchedAt)}` : "Watched"}
                </span>
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1">
            {upcoming ? (
              <span className="grid size-10 place-items-center rounded-full border border-dashed border-line text-[0.6rem] font-semibold uppercase text-muted">
                Soon
              </span>
            ) : (
              <button
                type="submit"
                name="intent"
                value={watched ? "unwatch" : "watch"}
                disabled={busy}
                aria-label={watched ? `Mark ${label} as not watched` : `Mark ${label} as watched`}
                aria-pressed={watched}
                className={`grid size-10 place-items-center rounded-full transition-colors disabled:opacity-60 ${
                  watched ? "bg-notice text-background" : "border-2 border-line text-muted hover:border-accent hover:text-accent"
                }`}
              >
                {pending === "watch" || pending === "unwatch" ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <CheckIcon className="h-5 w-5" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setMenu((current) => !current)}
              aria-expanded={menu}
              aria-label={`More for ${label}`}
              className="grid h-7 w-10 place-items-center rounded-full text-muted hover:text-foreground"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
          </div>
        </div>
        {menu ? (
          <div className="flex flex-wrap gap-2 pl-[7.75rem] sm:pl-[9.75rem]">
            {!upcoming ? (
              <button
                type="submit"
                name="intent"
                value="upto"
                disabled={busy}
                className="inline-flex h-9 items-center rounded-full border border-line px-3 text-sm font-semibold disabled:opacity-60"
              >
                {pending === "upto" ? "Saving…" : "Watched up to here"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setSummary((current) => !current);
                setMenu(false);
              }}
              className="inline-flex h-9 items-center rounded-full border border-line px-3 text-sm font-semibold"
            >
              {summary ? "Hide summary" : "Summary"}
            </button>
          </div>
        ) : null}
        {summary ? <p className="text-sm leading-6 text-muted">{overview}</p> : null}
        {error ? (
          <p role="alert" className="text-sm text-notice">
            {error}
          </p>
        ) : null}
      </form>
    </li>
  );
}

/** "1 Apr 2026" from a stored timestamp, in the viewer's own time zone. */
function formatWatched(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
