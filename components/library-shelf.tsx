"use client";

import { useState } from "react";
import Link from "next/link";

import { ChevronLeftIcon } from "@/components/icons";
import { TitleLink } from "@/components/title-link";

export type ShelfTitle = {
  id: number;
  href: string;
  title: string;
  posterUrl: string | null;
  meta: string;
  genres: string[];
  rating: string | null;
};

export function LibraryShelf({
  watchlist,
  ended,
  paused,
  toWatch,
}: {
  watchlist: ShelfTitle[];
  ended: ShelfTitle[];
  paused: ShelfTitle[];
  toWatch: ShelfTitle[];
}) {
  const [side, setSide] = useState<"shows" | "movies">("shows");

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Library">
        <TabButton
          selected={side === "shows"}
          onSelect={() => {
            setSide("shows");
          }}
          label="Shows"
        />
        <TabButton
          selected={side === "movies"}
          onSelect={() => {
            setSide("movies");
          }}
          label="Movies"
        />
      </div>
      {side === "shows" ? (
        <div className="grid gap-8">
          <OpenGroup title="Shows" titles={watchlist} empty="No shows on your watchlist." />
          {ended.length > 0 ? (
            <Link
              href="/profile/ended"
              className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3"
            >
              <span className="font-display text-2xl">Ended</span>
              <span className="flex items-center gap-2 text-muted">
                <span className="text-sm tabular-nums">{ended.length}</span>
                <ChevronLeftIcon className="h-4 w-4 rotate-180" />
              </span>
            </Link>
          ) : null}
          {paused.length > 0 ? (
            <details className="grid gap-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <span className="font-display text-2xl">Continue watching</span>
                <span className="text-sm tabular-nums text-muted">{paused.length}</span>
              </summary>
              <TitleList titles={paused} />
            </details>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-8">
          <OpenGroup title="Movies" titles={toWatch} empty="No movies on your watchlist." />
        </div>
      )}
      <Link href="/" className="text-sm font-semibold text-accent">
        Search for a title
      </Link>
    </div>
  );
}

function TabButton({
  selected,
  onSelect,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={
        selected
          ? "inline-flex h-12 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-ink"
          : "inline-flex h-12 items-center justify-center rounded-full border border-line text-sm font-semibold"
      }
    >
      {label}
    </button>
  );
}

function OpenGroup({
  title,
  titles,
  empty,
}: {
  title: string;
  titles: ShelfTitle[];
  empty: string;
}) {
  if (titles.length === 0 && empty.length === 0) {
    return null;
  }
  return (
    <section className="grid gap-3">
      <h2 className="font-display text-2xl">{title}</h2>
      {titles.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <TitleList titles={titles} />
      )}
    </section>
  );
}

function TitleList({ titles }: { titles: ShelfTitle[] }) {
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {titles.map((title) => (
        <li key={title.id}>
          <TitleLink
            href={title.href}
            title={title.title}
            posterUrl={title.posterUrl}
            meta={title.meta}
            genres={title.genres}
            rating={title.rating}
          />
        </li>
      ))}
    </ul>
  );
}
