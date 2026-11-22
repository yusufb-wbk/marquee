"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ShowMore, useIncremental } from "@/components/incremental-list";
import { Poster } from "@/components/poster";
import type { PersonCredit } from "@/lib/tmdb/credits";

type Kind = "all" | "movie" | "tv";

const STATUS_LABELS: Record<string, string> = {
  watched: "Watched",
  watching: "Watching",
  stopped: "Stopped",
  watchlist: "Watchlist",
};

/** A person's movies and shows, newest first, with your status on titles you track. */
export function PersonCredits({
  credits,
  statuses,
}: {
  credits: PersonCredit[];
  /** "movie:123" → your status for that title. */
  statuses: Record<string, string>;
}) {
  const [kind, setKind] = useState<Kind>("all");
  const counts = useMemo(
    () => ({
      all: credits.length,
      movie: credits.filter((credit) => credit.kind === "movie").length,
      tv: credits.filter((credit) => credit.kind === "tv").length,
    }),
    [credits],
  );
  const visible = useMemo(
    () =>
      credits
        .filter((credit) => kind === "all" || credit.kind === kind)
        // Undated titles are usually announced but not out yet, so they go first.
        .sort((a, b) => (b.year ?? "9999").localeCompare(a.year ?? "9999") || b.votes - a.votes),
    [credits, kind],
  );
  const { shown, remaining, showMore } = useIncremental(visible);

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Filmography</h2>
        <div role="group" aria-label="Show" className="flex gap-1 rounded-full bg-card p-1">
          {(
            [
              ["all", "All"],
              ["movie", "Movies"],
              ["tv", "Shows"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              disabled={counts[value] === 0}
              onClick={() => setKind(value)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold disabled:opacity-40 ${
                kind === value ? "bg-accent text-accent-ink" : ""
              }`}
            >
              {label}
              <span className="tabular-nums opacity-70">{counts[value]}</span>
            </button>
          ))}
        </div>
      </div>
      <ul className="grid gap-2 lg:grid-cols-2">
        {shown.map((credit) => {
          const status = statuses[`${credit.kind}:${credit.id}`];
          return (
            <li key={`${credit.kind}-${credit.id}`}>
              <Link
                href={`/${credit.kind}/${credit.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-card p-2.5 hover:border-accent/50"
              >
                <Poster src={credit.posterUrl} title={credit.title} />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate font-semibold">{credit.title}</span>
                  <span className="truncate text-sm text-muted">
                    {[credit.year ?? "Upcoming", credit.kind === "tv" ? "Show" : "Movie"].join(" · ")}
                  </span>
                  {credit.role ? <span className="line-clamp-1 text-sm text-muted">{credit.role}</span> : null}
                </span>
                {status && STATUS_LABELS[status] ? (
                  <span className="shrink-0 rounded-full bg-notice-bg px-2.5 py-1 text-xs font-semibold text-notice">
                    {STATUS_LABELS[status]}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <ShowMore remaining={remaining} onMore={showMore} />
    </section>
  );
}
