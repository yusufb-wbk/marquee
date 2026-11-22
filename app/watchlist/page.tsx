import { Suspense } from "react";
import Link from "next/link";

import { LibraryShelf, type ShelfTitle } from "@/components/library-shelf";
import { LibraryNotice } from "@/components/library-notice";
import { Message } from "@/components/message";
import { PageSkeleton } from "@/components/page-skeleton";
import { SchemaSetup } from "@/components/schema-setup";
import { firstQueryValue } from "@/lib/format";
import type { ShowStatus } from "@/lib/library/database";
import type { TrackedMovie, TrackedShow } from "@/lib/library/queries";
import { loadLibrary } from "@/lib/library/queries";
import { requireUser } from "@/lib/require-user";

export const metadata = {
  title: "Watchlist",
};

type PageProps = {
  searchParams: Promise<{ library?: string | string[] }>;
};

export default function WatchlistPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton kind="browse" />}>
      <WatchlistScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function WatchlistScreen({ searchParams }: PageProps) {
  const user = await requireUser();
  const library = await loadLibrary(user.id);
  const code = firstQueryValue((await searchParams).library);

  return (
    <div className="grid gap-6">
      <header className="flex items-end justify-between gap-3">
        <h1 className="font-display text-4xl tracking-tight">Watchlist</h1>
        <Link href="/watched" className="text-sm font-semibold text-accent">
          Watched
        </Link>
      </header>
      <LibraryNotice code={code} />
      {!library.ok && library.error === "schema" ? <SchemaSetup /> : null}
      {!library.ok && library.error !== "schema" ? (
        <Message tone="error" title="Your watchlist could not be loaded">
          Try again in a moment.
        </Message>
      ) : null}
      {library.ok ? (
        <LibraryShelf
          watchlist={showTitles(library.data.shows, "watchlist")}
          paused={showTitles(library.data.shows, "stopped")}
          toWatch={library.data.movies
            .filter((movie) => movie.status === "watchlist")
            .map((movie) => movieTitle(movie))}
        />
      ) : null}
    </div>
  );
}

function showTitles(shows: TrackedShow[], status: ShowStatus): ShelfTitle[] {
  return shows
    .filter((show) => show.status === status)
    .map((show) => ({
      id: show.tmdbId,
      href: `/tv/${show.tmdbId}`,
      title: show.title,
      posterUrl: show.posterUrl,
      meta: "",
    }));
}

function movieTitle(movie: TrackedMovie): ShelfTitle {
  return {
    id: movie.tmdbId,
    href: `/movie/${movie.tmdbId}`,
    title: movie.title,
    posterUrl: movie.posterUrl,
    meta: "",
  };
}
