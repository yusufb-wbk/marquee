import { Suspense } from "react";
import Link from "next/link";

import { readCsrfToken } from "@/components/csrf-field";
import { ChevronLeftIcon } from "@/components/icons";
import { LibraryShelf, type ShelfTitle } from "@/components/library-shelf";
import { LibraryNotice } from "@/components/library-notice";
import { Message } from "@/components/message";
import { PageSkeleton } from "@/components/page-skeleton";
import { ProfileView } from "@/components/profile-view";
import { SchemaSetup } from "@/components/schema-setup";
import { TmdbAttribution } from "@/components/tmdb-attribution";
import { WatchedBrowser } from "@/components/watched-browser";
import { loadEndedTitles } from "@/lib/library/ended";
import { firstQueryValue } from "@/lib/format";
import type { ShowStatus } from "@/lib/library/database";
import type { TrackedMovie, TrackedShow } from "@/lib/library/queries";
import { loadProfileLibrary } from "@/lib/library/queries";
import { profileTab } from "@/lib/profile-tab";
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
  const library = await loadProfileLibrary(user.id);
  const params = await searchParams;
  const tab = profileTab(firstQueryValue(params.tab));
  const code = firstQueryValue(params.library);

  const watched = library.ok
    ? buildWatchedTitles({
        shows: library.data.shows,
        movies: library.data.movies,
        episodes: library.data.episodes,
      })
    : [];

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
      <LibraryNotice code={code} />
      {!library.ok && library.error === "schema" ? <SchemaSetup /> : null}
      {!library.ok && library.error !== "schema" ? (
        <Message tone="error" title="Your profile could not be loaded">
          Try again in a moment.
        </Message>
      ) : null}
      {library.ok ? (
        <ProfileView
          // A link to another ?tab= starts the view on that tab.
          key={tab}
          initialTab={tab}
          counts={{
            watchlist:
              library.data.shows.filter((show) => show.status === "watchlist").length +
              library.data.movies.filter((movie) => movie.status === "watchlist").length,
            watched: watched.length,
          }}
          watchlist={
            <div className="grid gap-4">
              <Link href="/import?list=watchlist" className="text-sm font-semibold text-accent">
                Import from IMDb
              </Link>
              <LibraryShelf
                watchlist={showTitles(library.data.shows, "watchlist")}
                paused={showTitles(library.data.shows, "stopped")}
                toWatch={library.data.movies
                  .filter((movie) => movie.status === "watchlist")
                  .map((movie) => movieTitle(movie))}
                endedSlot={
                  // Needs a TMDB lookup per watching show, so it streams in after the page shows.
                  <Suspense fallback={null}>
                    <EndedLink userId={user.id} shows={library.data.shows} episodes={library.data.episodes} />
                  </Suspense>
                }
              />
            </div>
          }
          watched={
            <div className="grid gap-4">
              <Link href="/import?list=watched" className="text-sm font-semibold text-accent">
                Import from IMDb
              </Link>
              <WatchedBrowser csrf={csrf} titles={watched} />
            </div>
          }
        />
      ) : null}
      <footer className="mt-6 border-t border-line pt-6">
        <TmdbAttribution />
      </footer>
    </div>
  );
}

async function EndedLink({
  userId,
  shows,
  episodes,
}: {
  userId: string;
  shows: TrackedShow[];
  episodes: { showTmdbId: number; seasonNumber: number; episodeNumber: number }[];
}) {
  const ended = await loadEndedTitles(userId, shows, episodes);
  if (ended.length === 0) {
    return null;
  }
  return (
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
