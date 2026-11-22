import { Suspense } from "react";

import { readCsrfToken } from "@/components/csrf-field";
import { LibraryShelf, type ShelfTitle } from "@/components/library-shelf";
import { LibraryNotice } from "@/components/library-notice";
import { Message } from "@/components/message";
import { PageSkeleton } from "@/components/page-skeleton";
import { UpNextQueue } from "@/components/up-next-queue";
import { SchemaSetup } from "@/components/schema-setup";
import { isoDateUTC } from "@/lib/calendar";
import { firstQueryValue, formatAirDate } from "@/lib/format";
import type { ShowStatus } from "@/lib/library/database";
import type { TrackedMovie, TrackedShow } from "@/lib/library/queries";
import { loadLibrary } from "@/lib/library/queries";
import { lookupNextEpisode, watchedKeys } from "@/lib/library/up-next";
import { showsWithANextEpisode } from "@/lib/queue";
import { requireUser } from "@/lib/require-user";

export const metadata = {
  title: "Up next",
};

type PageProps = {
  searchParams: Promise<{ library?: string | string[] }>;
};

export default function UpNextPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton kind="queue" />}>
      <UpNextScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function UpNextScreen({ searchParams }: PageProps) {
  const user = await requireUser();
  const library = await loadLibrary(user.id);
  const code = firstQueryValue((await searchParams).library);

  return (
    <div className="grid gap-8">
      <h1 className="font-display text-4xl tracking-tight">Up next</h1>
      <LibraryNotice code={code} />
      {!library.ok && library.error === "schema" ? <SchemaSetup /> : null}
      {!library.ok && library.error !== "schema" ? (
        <Message tone="error" title="Your list could not be loaded">
          Try again in a moment.
        </Message>
      ) : null}
      {library.ok ? <Queue library={library.data} /> : null}
    </div>
  );
}

async function Queue({
  library,
}: {
  library: {
    shows: TrackedShow[];
    movies: TrackedMovie[];
    episodes: { showTmdbId: number; seasonNumber: number; episodeNumber: number }[];
  };
}) {
  const csrf = await readCsrfToken();
  const today = isoDateUTC(new Date());
  const watching = library.shows.filter((show) => show.status === "watching");
  const queued = await Promise.all(
    watching.map(async (show) => {
      const keys = watchedKeys(
        library.episodes.filter((episode) => episode.showTmdbId === show.tmdbId),
      );
      const next = await lookupNextEpisode(show.tmdbId, keys);
      return { show, next };
    }),
  );

  const waiting = showsWithANextEpisode(queued);
  return (
    <div className="grid gap-8">
      <UpNextQueue
        csrf={csrf}
        hadWatching={watching.length > 0}
        today={today}
        items={waiting.map((item) => ({
          showId: item.show.tmdbId,
          title: item.show.title,
          posterUrl: item.show.posterUrl,
          next: item.next,
        }))}
      />
      <LibraryShelf
        watching={showTitles(library.shows, "watching")}
        watchlist={showTitles(library.shows, "watchlist")}
        paused={showTitles(library.shows, "stopped")}
        toWatch={library.movies
          .filter((movie) => movie.status === "watchlist")
          .map((movie) => movieTitle(movie, ""))}
        watched={library.movies
          .filter((movie) => movie.status === "watched")
          .map((movie) => movieTitle(movie, watchedMeta(movie.watchedOn)))}
      />
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

function movieTitle(movie: TrackedMovie, meta: string): ShelfTitle {
  return {
    id: movie.tmdbId,
    href: `/movie/${movie.tmdbId}`,
    title: movie.title,
    posterUrl: movie.posterUrl,
    meta,
  };
}

function watchedMeta(watchedOn: string | null): string {
  const label = formatAirDate(watchedOn);
  return label ? `Watched ${label}` : "";
}
