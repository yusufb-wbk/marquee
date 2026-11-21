"use client";

import { useState, type FormEvent } from "react";

import { TitleLink } from "@/components/title-link";
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
  onCaughtUp,
}: {
  csrf: string;
  showId: number;
  title: string;
  posterUrl: string | null;
  next: NextCard;
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
    if (following.state === "caught_up") {
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
  const meta = [
    `S${current.episode.seasonNumber} E${current.episode.episodeNumber}`,
    current.episode.name,
    aired,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");

  return (
    <div className="grid gap-2">
      <TitleLink
        href={`/tv/${showId}?season=${current.episode.seasonNumber}`}
        title={title}
        posterUrl={posterUrl}
        meta={meta}
      />
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
