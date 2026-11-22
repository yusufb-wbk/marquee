import { Suspense } from "react";
import Link from "next/link";

import { LibraryShelf, type ShelfTitle } from "@/components/library-shelf";
import { LibraryNotice } from "@/components/library-notice";
import { Message } from "@/components/message";
import { PageSkeleton } from "@/components/page-skeleton";
import { SchemaSetup } from "@/components/schema-setup";
import { isoDateUTC, showsEndedForNow } from "@/lib/calendar";
import { firstQueryValue } from "@/lib/format";
import type { ShowStatus } from "@/lib/library/database";
import type { TrackedMovie, TrackedShow } from "@/lib/library/queries";
import { loadLibrary } from "@/lib/library/queries";
import { lookupNextEpisode, watchedKeys } from "@/lib/library/up-next";
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
        <Shelf
          shows={library.data.shows}
          movies={library.data.movies}
          episodes={library.data.episodes}
        />
      ) : null}
    </div>
  );
}

async function Shelf({
  shows,
  movies,
  episodes,
}: {
  shows: TrackedShow[];
  movies: TrackedMovie[];
  episodes: { showTmdbId: number; seasonNumber: number; episodeNumber: number }[];
}) {
  const today = isoDateUTC(new Date());
  const watching = shows.filter((show) => show.status === "watching");
  const lookedUp = await Promise.all(
    watching.map(async (show) => {
      const keys = watchedKeys(
        episodes.filter((episode) => episode.showTmdbId === show.tmdbId),
      );
      const next = await lookupNextEpisode(show.tmdbId, keys);
      return { show, next };
    }),
  );
  const ended = showsEndedForNow(lookedUp, today).map((item) => ({
    id: item.show.tmdbId,
    href: `/tv/${item.show.tmdbId}`,
    title: item.show.title,
    posterUrl: item.show.posterUrl,
    meta: "",
  }));

  return (
    <LibraryShelf
      watchlist={showTitles(shows, "watchlist")}
      ended={ended}
      paused={showTitles(shows, "stopped")}
      toWatch={movies.filter((movie) => movie.status === "watchlist").map((movie) => movieTitle(movie))}
    />
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
