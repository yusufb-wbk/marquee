"use client";

import { useState, type FormEvent } from "react";

import Link from "next/link";

import { Poster } from "@/components/poster";
import { TitleLink } from "@/components/title-link";
import { airHero, confirmedThisYear } from "@/lib/calendar";
import { formatAirDate } from "@/lib/format";
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

  const aired = formatAirDate(current.episode.airDate);
  const episodeLine = [
    `S${current.episode.seasonNumber} E${current.episode.episodeNumber}`,
    current.episode.name,
  ]
    .filter((part) => part.length > 0)
    .join(" · ");

  return (
    <div className="grid gap-3 rounded-3xl border border-line bg-card p-4">
      <Link
        href={`/tv/${showId}?season=${current.episode.seasonNumber}`}
        className="flex items-center gap-3"
      >
        <AirCountdown today={today} airDate={current.episode.airDate} />
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <Poster src={posterUrl} title={title} />
          <span className="grid min-w-0 gap-1">
            <span className="font-display text-2xl leading-tight">{title}</span>
            <span className="text-sm text-muted">{episodeLine}</span>
            {aired ? <span className="text-sm font-medium">{aired}</span> : null}
          </span>
        </span>
      </Link>
      <form action="/library/episode" method="post" onSubmit={onSubmit}>
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
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-60"
        >
          {pending ? "Saving…" : "Mark watched"}
        </button>
      </form>
      {notice ? (
        <p role="alert" className="text-sm text-notice">
          {notice}
        </p>
      ) : null}
    </div>
  );
}

function AirCountdown({ today, airDate }: { today: string; airDate: string | null }) {
  const hero = airHero(today, airDate);
  if (!hero) {
    return null;
  }
  if (hero.kind === "word") {
    return (
      <p className="grid w-[4.75rem] shrink-0 place-items-center rounded-2xl bg-background px-2 py-3 text-center font-display text-xl leading-none text-accent">
        {hero.value}
      </p>
    );
  }
  return (
    <p className="grid w-[4.75rem] shrink-0 justify-items-center gap-1 rounded-2xl bg-background px-2 py-3 text-center text-accent">
      <span className="font-display text-3xl leading-none tabular-nums">{hero.value}</span>
      <span className="text-[0.65rem] font-semibold uppercase leading-tight tracking-wide">
        {hero.label}
      </span>
    </p>
  );
}
