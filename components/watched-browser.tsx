"use client";

import { useMemo, useState } from "react";

import { ShowMore, useIncremental } from "@/components/incremental-list";
import { Poster } from "@/components/poster";
import { FilterRow } from "@/components/trending-browser";
import { WatchedRating } from "@/components/watched-rating";
import {
  filterWatched,
  groupByRating,
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
  const groups = useMemo(
    () => (query.sort === "rating" ? groupByRating(visible) : null),
    [query.sort, visible],
  );

  function update(patch: Partial<WatchedQuery>) {
    setQuery((current) => ({ ...current, ...patch }));
  }

  return (
    <div className="grid gap-4">
      <FilterRow
        query={query}
        genres={genres}
        years={years}
        count={visible.length}
        total={catalog.length}
        onClear={() => {
          setQuery(INITIAL);
        }}
        onChange={(patch) => {
          const next: Partial<WatchedQuery> = {};
          if (patch.text !== undefined) {
            next.text = patch.text;
          }
          if (patch.genre !== undefined) {
            next.genre = patch.genre;
          }
          if (patch.year !== undefined) {
            next.year = patch.year;
          }
          if (
            patch.rating === "any" ||
            patch.rating === "unrated" ||
            patch.rating === "5" ||
            patch.rating === "6" ||
            patch.rating === "7" ||
            patch.rating === "8" ||
            patch.rating === "9"
          ) {
            next.rating = patch.rating;
          }
          if (
            patch.sort === "recent" ||
            patch.sort === "rating" ||
            patch.sort === "title" ||
            patch.sort === "year"
          ) {
            next.sort = patch.sort;
          }
          update(next);
        }}
        type={{
          value: query.kind,
          onChange: (value) => {
            if (value === "all" || value === "movie" || value === "tv") {
              update({ kind: value });
            }
          },
        }}
        sorts={[
          { value: "recent", label: "Recently watched" },
          { value: "rating", label: "Your rating" },
          { value: "title", label: "Title" },
          { value: "year", label: "Year" },
        ]}
      />
      {catalog.length === 0 ? (
        <p className="text-muted">
          Nothing you have watched is here yet. Mark a movie or an episode, or
          import an IMDb export.
        </p>
      ) : visible.length === 0 ? (
        <p className="text-muted">Nothing matches these filters.</p>
      ) : groups ? (
        <div className="grid gap-6">
          {groups.map((group) => (
            <section key={group.label} className="grid gap-3">
              <h2 className="font-display text-2xl">{group.label}</h2>
              <WatchedList
                titles={group.titles}
                csrf={csrf}
                onRated={(kind, id, rating) => {
                  setCatalog((current) =>
                    current.map((item) =>
                      item.kind === kind && item.id === id ? { ...item, rating } : item,
                    ),
                  );
                }}
              />
            </section>
          ))}
        </div>
      ) : (
        <WatchedList
          titles={visible}
          csrf={csrf}
          onRated={(kind, id, rating) => {
            setCatalog((current) =>
              current.map((item) =>
                item.kind === kind && item.id === id ? { ...item, rating } : item,
              ),
            );
          }}
        />
      )}
    </div>
  );
}

function WatchedList({
  titles,
  csrf,
  onRated,
}: {
  titles: WatchedTitle[];
  csrf: string;
  onRated: (kind: WatchedTitle["kind"], id: number, rating: number | null) => void;
}) {
  const { shown, remaining, showMore } = useIncremental(titles);
  return (
    <div className="grid gap-4">
      <ul className="grid gap-3 lg:grid-cols-2">
        {shown.map((title) => (
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
                  onRated(title.kind, title.id, rating);
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      <ShowMore remaining={remaining} onMore={showMore} />
    </div>
  );
}
