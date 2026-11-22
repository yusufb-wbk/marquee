"use client";

import { useMemo, useState } from "react";

import { FilterSelect } from "@/components/filter-select";
import { ResultList } from "@/components/result-list";
import {
  catalogGenres,
  catalogYears,
  EMPTY_CATALOG,
  filterCatalog,
  isCatalogRating,
  isCatalogSort,
  type CatalogQuery,
} from "@/lib/catalog";
import type { SearchTitle } from "@/lib/tmdb/types";

export function TrendingBrowser({ titles }: { titles: SearchTitle[] }) {
  const [query, setQuery] = useState<CatalogQuery>(EMPTY_CATALOG);
  const genres = useMemo(() => catalogGenres(titles), [titles]);
  const years = useMemo(() => catalogYears(titles), [titles]);
  const visible = useMemo(
    () => filterCatalog(titles, query),
    [titles, query],
  );

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
    <div className="grid gap-4">
      <FilterRow
        query={query}
        genres={genres}
        years={years}
        onChange={update}
        onClear={() => {
          setQuery(EMPTY_CATALOG);
        }}
        count={visible.length}
        total={titles.length}
      />
      {titles.length === 0 ? (
        <p className="text-muted">Nothing is trending right now.</p>
      ) : visible.length === 0 ? (
        <p className="text-muted">Nothing matches these filters.</p>
      ) : (
        <ResultList titles={visible} />
      )}
    </div>
  );
}

const SORTS = [
  { value: "listed", label: "Sort" },
  { value: "rating", label: "Rating" },
  { value: "title", label: "Title" },
  { value: "year", label: "Year" },
] as const;

export function FilterRow({
  query,
  genres,
  years,
  onChange,
  onClear,
  count,
  total,
  type,
  sorts = SORTS,
}: {
  query: { text: string; genre: string; year: string; rating: string; sort: string };
  genres: string[];
  years: string[];
  onChange: (patch: Partial<{ text: string; genre: string; year: string; rating: string; sort: string }>) => void;
  onClear: () => void;
  count: number;
  total: number;
  type?: { value: string; onChange: (value: string) => void };
  sorts?: readonly { value: string; label: string }[];
}) {
  return (
    <div className="grid gap-3">
      <input
        value={query.text}
        onChange={(event) => {
          onChange({ text: event.target.value });
        }}
        placeholder="Search this page"
        aria-label="Search this page"
        className="h-12 w-full rounded-full border border-line bg-background px-4 text-base"
      />
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {type ? (
          <FilterSelect
            label="Type"
            value={type.value}
            onChange={type.onChange}
            options={[
              { value: "all", label: "Type" },
              { value: "tv", label: "Shows" },
              { value: "movie", label: "Movies" },
            ]}
          />
        ) : null}
        <FilterSelect
          label="Genre"
          value={query.genre}
          onChange={(genre) => {
            onChange({ genre });
          }}
          options={[{ value: "", label: "Genre" }, ...genres.map((genre) => ({ value: genre, label: genre }))]}
        />
        <FilterSelect
          label="Year"
          value={query.year}
          onChange={(year) => {
            onChange({ year });
          }}
          options={[{ value: "", label: "Year" }, ...years.map((year) => ({ value: year, label: year }))]}
        />
        <FilterSelect
          label="Rating"
          value={query.rating}
          onChange={(rating) => {
            if (isCatalogRating(rating)) {
              onChange({ rating });
            }
          }}
          options={[
            { value: "any", label: "Rating" },
            { value: "9", label: "9+" },
            { value: "8", label: "8+" },
            { value: "7", label: "7+" },
            { value: "6", label: "6+" },
            { value: "5", label: "5+" },
            { value: "unrated", label: "Not rated" },
          ]}
        />
        <FilterSelect
          label="Sort"
          value={query.sort}
          onChange={(sort) => {
            if (sorts.some((option) => option.value === sort)) {
              onChange({ sort });
            }
          }}
          options={sorts}
        />
      </div>
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted">
          {count === total ? `${total} titles` : `${count} of ${total} titles`}
        </p>
        <button type="button" onClick={onClear} className="text-sm font-semibold">
          Clear
        </button>
      </div>
    </div>
  );
}
