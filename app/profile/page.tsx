import { Suspense } from "react";
import Link from "next/link";

import { readCsrfToken } from "@/components/csrf-field";
import { LibraryShelf, type ShelfTitle } from "@/components/library-shelf";
import { LibraryNotice } from "@/components/library-notice";
import { Message } from "@/components/message";
import { PageSkeleton } from "@/components/page-skeleton";
import { ProfileTabs, profileTab } from "@/components/profile-tabs";
import { SchemaSetup } from "@/components/schema-setup";
import { WatchStats } from "@/components/watch-stats";
import { WatchedBrowser } from "@/components/watched-browser";
import { isoDateUTC, showsEndedForNow } from "@/lib/calendar";
import { firstQueryValue } from "@/lib/format";
import type { ShowStatus } from "@/lib/library/database";
import type { TrackedMovie, TrackedShow } from "@/lib/library/queries";
import { loadLibrary } from "@/lib/library/queries";
import { lookupNextEpisode, watchedKeys } from "@/lib/library/up-next";
import { requireUser } from "@/lib/require-user";
import { buildWatchedTitles } from "@/lib/watched";

export const metadata = {
  title: "Profile",
};

type PageProps = {
  searchParams: Promise<{ tab?: string | string[]; library?: string | string[] }>;
};

export default function ProfilePage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton kind="browse" />}>
      <ProfileScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function ProfileScreen({ searchParams }: PageProps) {
  const user = await requireUser();
  const library = await loadLibrary(user.id);
  const params = await searchParams;
  const tab = profileTab(firstQueryValue(params.tab));
  const code = firstQueryValue(params.library);

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h1 className="font-display text-4xl tracking-tight">Profile</h1>
        {user.email ? <p className="truncate text-sm text-muted">{user.email}</p> : null}
      </header>
      <ProfileTabs tab={tab} />
      <LibraryNotice code={code} />
      {!library.ok && library.error === "schema" ? <SchemaSetup /> : null}
      {!library.ok && library.error !== "schema" ? (
        <Message tone="error" title="Your profile could not be loaded">
          Try again in a moment.
        </Message>
      ) : null}
      {library.ok && tab === "watchlist" ? (
        <Shelf
          shows={library.data.shows}
          movies={library.data.movies}
          episodes={library.data.episodes}
        />
      ) : null}
      {library.ok && tab === "watched" ? (
        <div className="grid gap-4">
          <Link href="/import" className="text-sm font-semibold text-accent">
            Import from IMDb
          </Link>
          <WatchedBrowser
            csrf={await readCsrfToken()}
            titles={buildWatchedTitles({
              shows: library.data.shows,
              movies: library.data.movies,
              episodes: library.data.episodes,
            })}
          />
        </div>
      ) : null}
      {library.ok && tab === "insights" ? (
        <WatchStats
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
