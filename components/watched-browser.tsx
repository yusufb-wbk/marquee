"use client";

import { useMemo, useState } from "react";

import { Poster } from "@/components/poster";
import { WatchedRating } from "@/components/watched-rating";
import {
  filterWatched,
  type WatchedQuery,
  type WatchedTitle,
} from "@/lib/watched";
import Link from "next/link";

const INITIAL: WatchedQuery = {
  kind: "all",
  genre: "",
  year: "",
  rating: "any",
  sort: "recent",
  text: "",
};

export function WatchedBrowser({
  titles,
  csrf,
}: {
  titles: WatchedTitle[];
  csrf: string;
}) {
  const [catalog, setCatalog] = useState(titles);
  const [query, setQuery] = useState(INITIAL);
  const genres = useMemo(() => {
    const names = new Set(catalog.flatMap((title) => title.genres));
    return [...names].sort((left, right) => left.localeCompare(right));
  }, [catalog]);
  const years = useMemo(() => {
    const values = new Set(
      catalog.flatMap((title) => (title.year ? [title.year] : [])),
    );
    return [...values].sort((left, right) => right.localeCompare(left));
  }, [catalog]);
  const visible = useMemo(() => filterWatched(catalog, query), [catalog, query]);

  function update(patch: Partial<WatchedQuery>) {
    setQuery((current) => ({ ...current, ...patch }));
  }

  return (
    <div className="grid gap-4">
      <div className="flex gap-2">
        {(
          [
            ["all", "All"],
            ["movie", "Movies"],
            ["tv", "TV"],
          ] as const
        ).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            aria-pressed={query.kind === kind}
            onClick={() => {
              update({ kind });
            }}
            className={
              query.kind === kind
                ? "inline-flex h-11 items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink"
                : "inline-flex h-11 items-center rounded-full border border-line px-4 text-sm font-semibold"
            }
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Genre
          <select
            value={query.genre}
            onChange={(event) => {
              update({ genre: event.target.value });
            }}
            className="h-12 rounded-xl border border-line bg-background px-3 text-base font-normal"
          >
            <option value="">Any genre</option>
            {genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Year
          <select
            value={query.year}
            onChange={(event) => {
              update({ year: event.target.value });
            }}
            className="h-12 rounded-xl border border-line bg-background px-3 text-base font-normal"
          >
            <option value="">Any year</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Your rating
          <select
            value={query.rating}
            onChange={(event) => {
              const rating = event.target.value;
              if (
                rating === "any" ||
                rating === "unrated" ||
                rating === "5" ||
                rating === "6" ||
                rating === "7" ||
                rating === "8" ||
                rating === "9"
              ) {
                update({ rating });
              }
            }}
            className="h-12 rounded-xl border border-line bg-background px-3 text-base font-normal"
          >
            <option value="any">Any rating</option>
            <option value="9">9+</option>
            <option value="8">8+</option>
            <option value="7">7+</option>
            <option value="6">6+</option>
            <option value="5">5+</option>
            <option value="unrated">Not rated</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Sort
          <select
            value={query.sort}
            onChange={(event) => {
              const sort = event.target.value;
              if (
                sort === "recent" ||
                sort === "rating" ||
                sort === "title" ||
                sort === "year"
              ) {
                update({ sort });
              }
            }}
            className="h-12 rounded-xl border border-line bg-background px-3 text-base font-normal"
          >
            <option value="recent">Recently watched</option>
            <option value="rating">Your rating</option>
            <option value="title">Title</option>
            <option value="year">Year</option>
          </select>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium" htmlFor="watched-search">
        Title
        <input
          id="watched-search"
          value={query.text}
          onChange={(event) => {
            update({ text: event.target.value });
          }}
          className="h-12 rounded-xl border border-line bg-background px-4 text-base font-normal"
        />
      </label>
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted">
          {visible.length} of {catalog.length}
        </p>
        <button
          type="button"
          onClick={() => {
            setQuery(INITIAL);
          }}
          className="inline-flex h-11 items-center text-sm font-semibold"
        >
          Clear filters
        </button>
      </div>
      {catalog.length === 0 ? (
        <p className="text-muted">
          Nothing you have watched is here yet. Mark a movie or an episode, or
          import an IMDb export.
        </p>
      ) : visible.length === 0 ? (
        <p className="text-muted">Nothing matches these filters.</p>
      ) : (
        <ul className="grid gap-3">
          {visible.map((title) => (
            <li
              key={`${title.kind}-${title.id}`}
              className="flex gap-3 rounded-2xl border border-line bg-card p-3"
            >
              <Link
                href={title.kind === "tv" ? `/tv/${title.id}` : `/movie/${title.id}`}
                className="shrink-0"
              >
                <Poster src={title.posterUrl} title={title.title} />
              </Link>
              <div className="grid min-w-0 gap-2">
                <Link
                  href={title.kind === "tv" ? `/tv/${title.id}` : `/movie/${title.id}`}
                  className="grid gap-1"
                >
                  <span className="font-display text-xl leading-tight">{title.title}</span>
                  <span className="text-sm text-muted">
                    {[title.year, title.detail, ...title.genres.slice(0, 3)]
                      .filter((part): part is string => Boolean(part))
                      .join(" · ")}
                  </span>
                </Link>
                <WatchedRating
                  csrf={csrf}
                  kind={title.kind}
                  id={title.id}
                  stored={title.rating}
                  onRated={(rating) => {
                    setCatalog((current) =>
                      current.map((item) =>
                        item.kind === title.kind && item.id === title.id
                          ? { ...item, rating }
                          : item,
                      ),
                    );
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
