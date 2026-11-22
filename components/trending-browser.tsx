"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { CloseIcon, FilterIcon } from "@/components/icons";
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
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const active = [
    type && type.value !== "all",
    query.genre.length > 0,
    query.year.length > 0,
    query.rating !== "any",
    query.sort !== sorts[0]?.value,
  ].filter(Boolean).length;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <input
          value={query.text}
          onChange={(event) => {
            onChange({ text: event.target.value });
          }}
          placeholder="Search this page"
          aria-label="Search this page"
          className="h-12 min-w-0 flex-1 rounded-full border border-line bg-background px-4 text-base"
        />
        <button
          type="button"
          aria-label={active > 0 ? `Filters, ${active} on` : "Filters"}
          onClick={() => {
            setOpen(true);
          }}
          className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line"
        >
          <FilterIcon className="h-5 w-5" />
          {active > 0 ? (
            <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-ink">
              {active}
            </span>
          ) : null}
        </button>
      </div>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => {
          setOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setOpen(false);
          }
        }}
        className="w-[min(100%-2rem,26rem)] rounded-3xl border border-line bg-card p-5 text-foreground"
      >
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id={titleId} className="font-display text-2xl">
              Filters
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                setOpen(false);
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
          {type ? (
            <Field
              label="Type"
              value={type.value}
              onChange={type.onChange}
              options={[
                { value: "all", label: "All" },
                { value: "tv", label: "Shows" },
                { value: "movie", label: "Movies" },
              ]}
            />
          ) : null}
          <Field
            label="Genre"
            value={query.genre}
            onChange={(genre) => {
              onChange({ genre });
            }}
            options={[{ value: "", label: "Any genre" }, ...genres.map((genre) => ({ value: genre, label: genre }))]}
          />
          <Field
            label="Year"
            value={query.year}
            onChange={(year) => {
              onChange({ year });
            }}
            options={[{ value: "", label: "Any year" }, ...years.map((year) => ({ value: year, label: year }))]}
          />
          <Field
            label="Rating"
            value={query.rating}
            onChange={(rating) => {
              if (isCatalogRating(rating)) {
                onChange({ rating });
              }
            }}
            options={[
              { value: "any", label: "Any rating" },
              { value: "9", label: "9+" },
              { value: "8", label: "8+" },
              { value: "7", label: "7+" },
              { value: "6", label: "6+" },
              { value: "5", label: "5+" },
              { value: "unrated", label: "Not rated" },
            ]}
          />
          <Field
            label="Sort"
            value={query.sort}
            onChange={(sort) => {
              if (sorts.some((option) => option.value === sort)) {
                onChange({ sort });
              }
            }}
            options={sorts}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-line text-sm font-semibold"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
              }}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-ink"
            >
              Done
            </button>
          </div>
        </div>
      </dialog>
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

function Field({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="h-12 rounded-xl border border-line bg-background px-3 text-base font-normal"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
