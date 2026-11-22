"use client";

import { useState } from "react";

import { Message } from "@/components/message";
import { QueuedShow } from "@/components/queued-show";

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

export type QueueItem = {
  showId: number;
  title: string;
  posterUrl: string | null;
  next: NextCard;
};

export function UpNextQueue({
  csrf,
  hadWatching,
  unavailable = 0,
  today,
  items,
}: {
  csrf: string;
  hadWatching: boolean;
  unavailable?: number;
  today: string;
  items: QueueItem[];
}) {
  const [gone, setGone] = useState<number[]>([]);
  const visible = items.filter((item) => !gone.includes(item.showId));

  const notice =
    unavailable > 0 ? (
      <Message
        tone="notice"
        title={
          unavailable === 1
            ? "1 show could not be loaded right now"
            : `${unavailable} shows could not be loaded right now`
        }
      >
        TMDB is busy. Reload in a minute to see {unavailable === 1 ? "it" : "them"}.
      </Message>
    ) : null;

  if (visible.length === 0) {
    return (
      notice ?? (
        <p className="text-muted">
          {hadWatching ? "Nothing is dated for the next year." : "Nothing is queued."}
        </p>
      )
    );
  }

  const airDateOf = (item: QueueItem) =>
    item.next.state === "ready" ? (item.next.episode.airDate ?? "") : "";
  // Coming up: not aired yet, soonest first. Ready: aired, newest first, so new
  // episodes of current shows sit above old backlog.
  const comingUp = visible.filter((item) => airDateOf(item) > today);
  const ready = visible
    .filter((item) => airDateOf(item) <= today)
    .sort((left, right) => airDateOf(right).localeCompare(airDateOf(left)));

  const renderList = (list: QueueItem[]) => (
    <ul className="grid gap-3 lg:grid-cols-2">
      {list.map((item) => (
        <li key={item.showId}>
          <QueuedShow
            csrf={csrf}
            showId={item.showId}
            title={item.title}
            posterUrl={item.posterUrl}
            next={item.next}
            today={today}
            onCaughtUp={() => {
              setGone((current) =>
                current.includes(item.showId) ? current : [...current, item.showId],
              );
            }}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="grid gap-8">
      {notice}
      {comingUp.length > 0 ? (
        <section className="grid gap-3">
          <SectionHeading title="Coming up" count={comingUp.length} />
          {renderList(comingUp)}
        </section>
      ) : null}
      {ready.length > 0 ? (
        <section className="grid gap-3">
          <SectionHeading title="Ready to watch" count={ready.length} />
          {renderList(ready)}
        </section>
      ) : null}
    </div>
  );
}

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="flex items-baseline gap-2 font-display text-2xl">
      {title}
      <span className="font-sans text-sm tabular-nums text-muted">{count}</span>
    </h2>
  );
}
