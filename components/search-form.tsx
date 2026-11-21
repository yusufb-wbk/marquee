"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { normalizeSearchQuery } from "@/lib/search-query";
import {
  parseSuggestions,
  suggestionHref,
  type SearchSuggestion,
} from "@/lib/search-suggestions";

export function SearchForm({ query }: { query: string }) {
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [titles, setTitles] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const normalized = normalizeSearchQuery(value.trim().replace(/\s+/g, " "));
  const selected = useMemo(
    () => (titles.length === 0 ? 0 : Math.min(active, titles.length - 1)),
    [active, titles.length],
  );
  const visible = open && normalized !== null ? titles : [];

  useEffect(() => {
    if (normalized === null) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      void loadSuggestions(normalized, controller.signal, {
        setTitles,
        setOpen,
        setActive,
        setNotice,
      });
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [normalized]);

  return (
    <form
      action="/"
      method="get"
      role="search"
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="grid w-full gap-2">
        <label className="text-sm font-medium" htmlFor="q">
          Show or movie
        </label>
        <div className="relative">
          <input
            id="q"
            name="q"
            value={value}
            role="combobox"
            aria-expanded={visible.length > 0}
            aria-controls="search-suggestions"
            aria-autocomplete="list"
            aria-activedescendant={
              visible.length > 0 ? `suggestion-${selected}` : undefined
            }
            required
            minLength={2}
            maxLength={80}
            enterKeyHint="search"
            autoComplete="off"
            onChange={(event) => {
              setValue(event.target.value);
              setNotice(null);
              setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
            }}
            onBlur={() => {
              setOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
                return;
              }
              if (visible.length === 0) {
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive(Math.min(selected + 1, visible.length - 1));
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive(Math.max(selected - 1, 0));
                return;
              }
              if (event.key === "Enter") {
                const choice = visible[selected];
                if (!choice) {
                  return;
                }
                event.preventDefault();
                router.push(suggestionHref(choice));
              }
            }}
            className="h-12 w-full rounded-xl border border-line bg-card px-4 text-base font-normal text-foreground"
          />
          {visible.length > 0 ? (
            <ul
              id="search-suggestions"
              role="listbox"
              className="absolute top-full z-20 mt-2 grid w-full overflow-hidden rounded-xl border border-line bg-card"
            >
              {visible.map((title, index) => (
                <li key={`${title.mediaType}-${title.id}`} role="presentation">
                  <Link
                    id={`suggestion-${index}`}
                    role="option"
                    aria-selected={index === selected}
                    href={suggestionHref(title)}
                    prefetch={false}
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    className={`flex h-12 items-center gap-2 px-4 text-sm ${
                      index === selected ? "bg-background" : ""
                    }`}
                  >
                    <span className="truncate font-medium">{title.title}</span>
                    {title.year ? (
                      <span className="text-muted">{title.year}</span>
                    ) : null}
                    <span className="text-muted">
                      {title.mediaType === "tv" ? "Show" : "Movie"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {notice ? <p className="text-sm text-muted">{notice}</p> : null}
      </div>
      <button
        type="submit"
        className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 text-base font-semibold text-accent-ink"
      >
        Search
      </button>
    </form>
  );
}

function loadSuggestions(
  query: string,
  signal: AbortSignal,
  actions: {
    setTitles: (titles: SearchSuggestion[]) => void;
    setOpen: (open: boolean) => void;
    setActive: (active: number) => void;
    setNotice: (notice: string | null) => void;
  },
) {
  return fetch(`/api/search?q=${encodeURIComponent(query)}`, {
    signal,
    headers: { accept: "application/json" },
  })
    .then(async (response) => {
      if (signal.aborted) {
        return;
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (response.status === 429) {
        actions.setTitles([]);
        actions.setNotice("Too many searches. Wait a few minutes.");
        return;
      }
      if (!response.ok || !contentType.includes("application/json")) {
        actions.setTitles([]);
        return;
      }
      const body: unknown = await response.json();
      actions.setTitles(parseSuggestions(body));
      actions.setActive(0);
      actions.setOpen(true);
      actions.setNotice(null);
    })
    .catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      if (!signal.aborted) {
        actions.setTitles([]);
      }
    });
}
