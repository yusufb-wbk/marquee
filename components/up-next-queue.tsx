"use client";

import { useState } from "react";

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
  today,
  items,
}: {
  csrf: string;
  hadWatching: boolean;
  today: string;
  items: QueueItem[];
}) {
  const [gone, setGone] = useState<number[]>([]);
  const visible = items.filter((item) => !gone.includes(item.showId));

  if (visible.length === 0) {
    return (
      <p className="text-muted">
        {hadWatching ? "Nothing is dated for the next year." : "Nothing is queued."}
      </p>
    );
  }

  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {visible.map((item) => (
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
}
