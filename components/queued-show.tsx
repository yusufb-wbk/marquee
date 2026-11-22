"use client";

import { useState, type FormEvent } from "react";

import Link from "next/link";

import { Poster } from "@/components/poster";
import { TitleLink } from "@/components/title-link";
import { airHero, confirmedThisYear } from "@/lib/calendar";
import { libraryNotice } from "@/lib/library/notices";
import { submitLibraryForm, submitterOf } from "@/lib/library/submit";

type QueuedEpisode = {
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  airDate: string | null;
};

type NextCard =
  | { state: "ready"; episode: QueuedEpisode }
  | { state: "caught_up" }
  | { state: "error"; message: string };

function isQueuedEpisode(value: unknown): value is QueuedEpisode {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const episode = value as Record<string, unknown>;
  return (
    typeof episode.seasonNumber === "number" &&
    typeof episode.episodeNumber === "number" &&
    typeof episode.name === "string" &&
    (episode.airDate === null || typeof episode.airDate === "string")
  );
}

function readNext(data: unknown): NextCard | null {
  if (typeof data !== "object" || data === null || !("next" in data)) {
    return null;
  }
  const next = data.next;
  if (typeof next !== "object" || next === null || !("state" in next)) {
    return null;
  }
  const card = next as Record<string, unknown>;
  if (card.state === "caught_up") {
    return { state: "caught_up" };
  }
  if (card.state === "error" && typeof card.message === "string") {
    return { state: "error", message: card.message };
  }
  if (card.state === "ready" && isQueuedEpisode(card.episode)) {
    return { state: "ready", episode: card.episode };
  }
  return null;
}

export function QueuedShow({
  csrf,
  showId,
  title,
  posterUrl,
  next,
  today,
  onCaughtUp,
}: {
  csrf: string;
  showId: number;
  title: string;
  posterUrl: string | null;
  next: NextCard;
  today: string;
  onCaughtUp: () => void;
}) {
  const [current, setCurrent] = useState(next);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || current.state !== "ready") {
      return;
    }
    setPending(true);
    setNotice(null);
    const result = await submitLibraryForm(event.currentTarget, submitterOf(event));
    setPending(false);
    if (!result.ok) {
      setNotice(libraryNotice(result.error)?.title ?? "That change was not saved");
      return;
    }
    const following = readNext(result.data) ?? { state: "caught_up" };
    if (
      following.state !== "ready" ||
      !confirmedThisYear(following.episode.airDate, today)
    ) {
      onCaughtUp();
      return;
    }
    setCurrent(following);
  }

  if (current.state === "error") {
    return (
      <div className="grid gap-2">
        <TitleLink
          href={`/tv/${showId}`}
          title={title}
          posterUrl={posterUrl}
          meta="The next episode could not be loaded"
        />
        <p className="text-sm text-muted">{current.message}</p>
      </div>
    );
  }

  if (current.state === "caught_up") {
    return null;
  }

  const hero = airHero(today, current.episode.airDate);
  const upcoming = hero !== null && hero.kind === "count" && !hero.label.endsWith("ago");
  const episodeLine = [
    `S${current.episode.seasonNumber} E${current.episode.episodeNumber}`,
    current.episode.name,
  ]
    .filter((part) => part.length > 0)
    .join(" · ");
  const shortDate = formatShortDate(current.episode.airDate, today);
  const outToday = hero?.kind === "word";
  const episodeLabel = `S${current.episode.seasonNumber} E${current.episode.episodeNumber}`;

  return (
    <div className="flex gap-4 rounded-3xl border border-line bg-card p-3">
      <Link
        href={`/tv/${showId}?season=${current.episode.seasonNumber}`}
        className="shrink-0"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Poster src={posterUrl} title={title} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-1">
        <Link
          href={`/tv/${showId}?season=${current.episode.seasonNumber}`}
          className="grid min-w-0 gap-0.5"
        >
          <span className="line-clamp-2 font-display text-xl leading-tight">{title}</span>
          <span className="truncate text-sm text-muted">{episodeLine}</span>
          {outToday ? (
            <span className="text-xs font-semibold text-accent">Out today</span>
          ) : shortDate ? (
            <span className="text-xs text-muted">{shortDate}</span>
          ) : null}
        </Link>
        {notice ? (
          <p role="alert" className="text-sm text-notice">
            {notice}
          </p>
        ) : null}
      </div>
      <div className="grid w-16 shrink-0 content-center justify-items-center gap-1 self-stretch border-l border-line pl-3 text-center">
        {upcoming && hero?.kind === "count" ? (
          <div className="grid justify-items-center gap-1 text-accent">
            <span className="font-display text-4xl leading-none tabular-nums">{hero.value}</span>
            <span className="text-[0.65rem] font-semibold uppercase leading-tight tracking-wide">
              {hero.value === "1" ? "day" : "days"}
            </span>
          </div>
        ) : (
          <form action="/library/episode" method="post" onSubmit={onSubmit} className="grid justify-items-center gap-1">
            <input type="hidden" name="csrf" value={csrf} />
            <input type="hidden" name="showId" value={showId} />
            <input type="hidden" name="season" value={current.episode.seasonNumber} />
            <input type="hidden" name="episode" value={current.episode.episodeNumber} />
            <input type="hidden" name="next" value="/up-next" />
            <input type="hidden" name="advance" value="1" />
            <button
              type="submit"
              name="intent"
              value="watch"
              disabled={pending}
              aria-label={`Mark ${title} ${episodeLabel} watched`}
              className="grid size-12 place-items-center rounded-full bg-accent text-accent-ink transition-transform active:scale-95 disabled:opacity-60"
            >
              {pending ? <Spinner /> : <CheckIcon />}
            </button>
            <span aria-hidden="true" className="text-[0.65rem] font-semibold uppercase leading-tight tracking-wide text-muted">
              Watched
            </span>
          </form>
        )}
      </div>
    </div>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Fri 27 Nov", with the year added when it is not this year: "Sun 20 Jan 2008". */
function formatShortDate(value: string | null, today: string): string | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!match) {
    return null;
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const day = `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  return match[1] === today.slice(0, 4) ? day : `${day} ${match[1]}`;
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}
