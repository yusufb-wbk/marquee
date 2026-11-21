import { Suspense } from "react";
import Link from "next/link";

import { readCsrfToken } from "@/components/csrf-field";
import { LibraryNotice } from "@/components/library-notice";
import { Message } from "@/components/message";
import { UpNextQueue } from "@/components/up-next-queue";
import { SchemaSetup } from "@/components/schema-setup";
import { TitleLink } from "@/components/title-link";
import { firstQueryValue } from "@/lib/format";
import type { ShowStatus } from "@/lib/library/database";
import type { EpisodeWatch, TrackedMovie, TrackedShow } from "@/lib/library/queries";
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
    <Suspense fallback={<p className="text-muted">Loading up next…</p>}>
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
      <header className="grid gap-2">
        <h1 className="font-display text-4xl tracking-tight">Up next</h1>
        <p className="leading-7 text-muted">
          One tap marks the next episode. A show leaves this list when its current season is finished and nothing new is listed yet.
        </p>
      </header>
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
    episodes: EpisodeWatch[];
  };
}) {
  const csrf = await readCsrfToken();
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
        items={waiting.map((item) => ({
          showId: item.show.tmdbId,
          title: item.show.title,
          posterUrl: item.show.posterUrl,
          next: item.next,
        }))}
      />
      <ShowGroup
        title="Watching"
        shows={library.shows.filter((show) => show.status === "watching")}
      />
      <ShowGroup
        title="Watchlist"
        shows={library.shows.filter((show) => show.status === "watchlist")}
      />
      <ShowGroup
        title="Stopped"
        shows={library.shows.filter((show) => show.status === "stopped")}
      />
      <MovieGroup title="Movies to watch" movies={library.movies.filter((movie) => movie.status === "watchlist")} />
      <MovieGroup title="Movies watched" movies={library.movies.filter((movie) => movie.status === "watched")} />
    </div>
  );
}

function ShowGroup({
  title,
  shows,
}: {
  title: string;
  shows: TrackedShow[];
}) {
  return (
    <section className="grid gap-3">
      <h2 className="font-display text-2xl">{title}</h2>
      {shows.length === 0 ? (
        <p className="text-sm text-muted">None yet.</p>
      ) : (
        <ul className="grid gap-3">
          {shows.map((show) => (
            <li key={show.tmdbId}>
              <TitleLink
                href={`/tv/${show.tmdbId}`}
                title={show.title}
                posterUrl={show.posterUrl}
                meta={statusLabel(show.status)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MovieGroup({
  title,
  movies,
}: {
  title: string;
  movies: TrackedMovie[];
}) {
  return (
    <section className="grid gap-3">
      <h2 className="font-display text-2xl">{title}</h2>
      {movies.length === 0 ? (
        <p className="text-sm text-muted">None yet.</p>
      ) : (
        <ul className="grid gap-3">
          {movies.map((movie) => (
            <li key={movie.tmdbId}>
              <TitleLink
                href={`/movie/${movie.tmdbId}`}
                title={movie.title}
                posterUrl={movie.posterUrl}
                meta={movie.watchedOn ? `Watched ${movie.watchedOn}` : "Watchlist"}
              />
            </li>
          ))}
        </ul>
      )}
      <Link href="/" className="text-sm text-muted">
        Search for a title
      </Link>
    </section>
  );
}

function statusLabel(status: ShowStatus): string {
  if (status === "watching") {
    return "Watching";
  }
  if (status === "watchlist") {
    return "Watchlist";
  }
  return "Stopped";
}
