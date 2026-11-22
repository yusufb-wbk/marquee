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
import { loadEndedTitles } from "@/lib/library/ended";
import { firstQueryValue } from "@/lib/format";
import type { ShowStatus } from "@/lib/library/database";
import type { TrackedMovie, TrackedShow } from "@/lib/library/queries";
import { loadLibrary } from "@/lib/library/queries";
import { ratingToDisplay, userRatingLabel } from "@/lib/rating";
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
  const csrf = await readCsrfToken();
  const library = await loadLibrary(user.id);
  const params = await searchParams;
  const tab = profileTab(firstQueryValue(params.tab));
  const code = firstQueryValue(params.library);

  return (
    <div className="grid gap-6">
      <header className="flex items-end justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <h1 className="font-display text-4xl tracking-tight">Profile</h1>
          {user.email ? <p className="truncate text-sm text-muted">{user.email}</p> : null}
        </div>
        <form action="/auth/signout" method="post">
          {csrf.length > 0 ? <input type="hidden" name="csrf" value={csrf} /> : null}
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-full border border-line px-4 text-sm font-semibold"
          >
            Sign out
          </button>
        </form>
      </header>
      <ProfileTabs
        tab={tab}
        counts={
          library.ok
            ? {
                watchlist:
                  library.data.shows.filter((show) => show.status === "watchlist").length +
                  library.data.movies.filter((movie) => movie.status === "watchlist").length,
                watched: buildWatchedTitles({
                  shows: library.data.shows,
                  movies: library.data.movies,
                  episodes: library.data.episodes,
                }).length,
              }
            : null
        }
      />
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
            csrf={csrf}
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
  const ended = await loadEndedTitles(shows, episodes);

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
      genres: show.genres.slice(0, 2),
      rating: userRatingLabel(show.rating),
      year: show.year,
      score: show.rating === null ? null : ratingToDisplay(show.rating),
      kind: "tv",
    }));
}

function movieTitle(movie: TrackedMovie): ShelfTitle {
  return {
    id: movie.tmdbId,
    href: `/movie/${movie.tmdbId}`,
    title: movie.title,
    posterUrl: movie.posterUrl,
    meta: "",
    genres: movie.genres.slice(0, 2),
    rating: userRatingLabel(movie.rating),
    year: movie.year,
    score: movie.rating === null ? null : ratingToDisplay(movie.rating),
    kind: "movie",
  };
}
