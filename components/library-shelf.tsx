"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { FilterRow } from "@/components/trending-browser";
import { ChevronLeftIcon } from "@/components/icons";
import { TitleLink } from "@/components/title-link";
import {
  catalogGenres,
  catalogYears,
  EMPTY_CATALOG,
  filterCatalog,
  isCatalogRating,
  isCatalogSort,
  type CatalogQuery,
} from "@/lib/catalog";

export type ShelfTitle = {
  id: number;
  href: string;
  title: string;
  posterUrl: string | null;
  meta: string;
  genres: string[];
  rating: string | null;
  year: string | null;
  score: number | null;
  kind: "movie" | "tv";
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
  const [kind, setKind] = useState<"all" | "tv" | "movie">("all");
  const [query, setQuery] = useState<CatalogQuery>(EMPTY_CATALOG);
  const saved = useMemo(
    () =>
      [...watchlist, ...toWatch].map((title) => ({
        title: title.title,
        year: title.year,
        genres: title.genres,
        rating: title.score,
        kind: title.kind,
        source: title,
      })),
    [watchlist, toWatch],
  );
  const typed = useMemo(
    () => saved.filter((title) => kind === "all" || title.kind === kind),
    [saved, kind],
  );
  const genres = useMemo(() => catalogGenres(typed), [typed]);
  const years = useMemo(() => catalogYears(typed), [typed]);
  const visible = useMemo(() => filterCatalog(typed, query), [typed, query]);

  function update(patch: Partial<{ text: string; genre: string; year: string; rating: string; sort: string }>) {
    setQuery((current) => ({
      text: patch.text ?? current.text,
      genre: patch.genre ?? current.genre,
      year: patch.year ?? current.year,
      rating: patch.rating !== undefined && isCatalogRating(patch.rating) ? patch.rating : current.rating,
      sort: patch.sort !== undefined && isCatalogSort(patch.sort) ? patch.sort : current.sort,
    }));
  }

  return (
    <div className="grid gap-6">
      <FilterRow
        query={query}
        genres={genres}
        years={years}
        onChange={update}
        onClear={() => {
          setKind("all");
          setQuery(EMPTY_CATALOG);
        }}
        count={visible.length}
        total={saved.length}
        type={{
          value: kind,
          onChange: (value) => {
            if (value === "all" || value === "tv" || value === "movie") {
              setKind(value);
            }
          },
        }}
      />
      {saved.length === 0 ? (
        <p className="text-sm text-muted">Nothing is on your watchlist.</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted">Nothing matches these filters.</p>
      ) : (
        <TitleList titles={visible.map((title) => title.source)} />
      )}
      {kind !== "movie" ? (
        <div className="grid gap-8">
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
      ) : null}
      <Link href="/" className="text-sm font-semibold text-accent">
        Search for a title
      </Link>
    </div>
  );
}

function TitleList({ titles }: { titles: ShelfTitle[] }) {
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {titles.map((title) => (
        <li key={`${title.kind}-${title.id}`}>
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
