"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { FilterRow } from "@/components/trending-browser";
import { ShowMore, useIncremental } from "@/components/incremental-list";
import { StarIcon, TrashIcon } from "@/components/icons";
import { Poster } from "@/components/poster";
import { useScores } from "@/components/use-scores";
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
  csrf,
  watchlist,
  endedSlot,
  paused,
  toWatch,
}: {
  csrf: string;
  watchlist: ShelfTitle[];
  /** The "Ended" link. It needs TMDB lookups, so the page streams it in on its own. */
  endedSlot?: ReactNode;
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
  // Titles removed here stay hidden until the page refreshes with the new list.
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const visible = useMemo(
    () => filterCatalog(typed, query).filter((title) => !removed.has(keyOf(title.source))),
    [typed, query, removed],
  );
  const visibleTitles = useMemo(() => visible.map((title) => title.source), [visible]);

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
        <TitleList
          titles={visibleTitles}
          remove={{
            csrf,
            onRemoved: (title) => setRemoved((current) => new Set(current).add(keyOf(title))),
          }}
        />
      )}
      {kind !== "movie" ? (
        <div className="grid gap-8">
          {endedSlot}
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

function keyOf(title: Pick<ShelfTitle, "kind" | "id">): string {
  return `${title.kind}-${title.id}`;
}

type RemoveOptions = { csrf: string; onRemoved: (title: ShelfTitle) => void };

function TitleList({ titles, remove }: { titles: ShelfTitle[]; remove?: RemoveOptions }) {
  const { shown, remaining, showMore } = useIncremental(titles);
  const scores = useScores(useMemo(() => shown.map(keyOf), [shown]));
  return (
    <div className="grid gap-4">
      <ul className="grid gap-3 lg:grid-cols-2">
        {shown.map((title) => {
          const key = keyOf(title);
          return (
            <li key={key} className="relative">
              <ShelfRow title={title} score={key in scores ? scores[key]! : undefined} padded={Boolean(remove)} />
              {remove ? <RemoveButton title={title} options={remove} /> : null}
            </li>
          );
        })}
      </ul>
      <ShowMore remaining={remaining} onMore={showMore} />
    </div>
  );
}

function ShelfRow({
  title,
  score,
  padded,
}: {
  title: ShelfTitle;
  /** Combined MDBList score; undefined while loading, null when there is none. */
  score: number | null | undefined;
  padded: boolean;
}) {
  return (
    <Link
      href={title.href}
      className={`flex gap-3 rounded-2xl border border-line bg-card p-3 transition-colors hover:border-accent/50 ${padded ? "pr-14" : ""}`}
    >
      <Poster src={title.posterUrl} title={title.title} />
      <span className="grid min-w-0 content-start gap-1.5">
        <span className="font-display text-xl leading-tight">{title.title}</span>
        <span className="text-sm text-muted">
          {[title.year, ...title.genres].filter(Boolean).join(" · ")}
        </span>
        <span className="flex flex-wrap items-center gap-2 pt-0.5">
          {score === undefined ? (
            <span className="h-7 w-14 animate-pulse rounded-full bg-line/60" aria-hidden="true" />
          ) : score !== null ? (
            <CombinedBadge score={score} />
          ) : null}
          {title.score !== null ? (
            <span
              className="inline-flex h-7 items-center gap-1 rounded-full border border-accent/60 px-2.5 text-sm font-semibold tabular-nums"
              title="Your rating"
            >
              <StarIcon className="size-3.5 text-accent" />
              {Number.isInteger(title.score) ? title.score : title.score.toFixed(1)}
              <span className="text-xs font-normal text-muted">yours</span>
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}

function CombinedBadge({ score }: { score: number }) {
  const angle = Math.round((score / 100) * 360);
  return (
    <span
      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line px-2 text-sm font-semibold tabular-nums"
      title="Combined score from MDBList"
    >
      <span
        aria-hidden="true"
        className="grid size-4 place-items-center rounded-full"
        style={{ background: `conic-gradient(var(--accent) ${angle}deg, var(--line) 0deg)` }}
      >
        <span className="size-2 rounded-full bg-card" />
      </span>
      {Math.round(score)}
    </span>
  );
}

/** Two taps: the first asks, the second removes. */
function RemoveButton({ title, options }: { title: ShelfTitle; options: RemoveOptions }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "pending" | "failed">("idle");

  async function removeTitle() {
    setState("pending");
    const body = new FormData();
    body.set("csrf", options.csrf);
    body.set("tmdbId", String(title.id));
    body.set("status", "remove");
    const response = await fetch(title.kind === "movie" ? "/library/movie" : "/library/show", {
      method: "POST",
      body,
      credentials: "same-origin",
      headers: { accept: "application/json" },
    }).catch(() => null);
    const payload = (response ? await response.json().catch(() => null) : null) as { ok?: boolean } | null;
    if (!payload?.ok) {
      setState("failed");
      return;
    }
    options.onRemoved(title);
    // Refresh the counts on the tabs.
    router.refresh();
  }

  if (state === "idle") {
    return (
      <button
        type="button"
        aria-label={`Remove ${title.title} from your watchlist`}
        onClick={() => setState("confirm")}
        className="absolute right-3 top-3 grid size-10 place-items-center rounded-full border border-line bg-background text-muted transition-colors hover:border-danger/60 hover:text-danger"
      >
        <TrashIcon className="size-4" />
      </button>
    );
  }
  return (
    <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-line bg-background p-1 shadow-lg">
      <button
        type="button"
        onClick={() => setState("idle")}
        disabled={state === "pending"}
        className="h-8 rounded-full px-3 text-sm text-muted disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() => {
          void removeTitle();
        }}
        disabled={state === "pending"}
        className="h-8 rounded-full bg-danger-bg px-3 text-sm font-semibold text-danger disabled:opacity-60"
      >
        {state === "pending" ? "Removing…" : state === "failed" ? "Try again" : "Remove"}
      </button>
    </div>
  );
}
