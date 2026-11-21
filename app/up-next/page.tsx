import { Suspense } from "react";
import Link from "next/link";

import { LibraryNotice } from "@/components/library-notice";
import { Message } from "@/components/message";
import { SchemaSetup } from "@/components/schema-setup";
import { TitleLink } from "@/components/title-link";
import { firstQueryValue, formatAirDate } from "@/lib/format";
import type { ShowStatus } from "@/lib/library/database";
import type { EpisodeWatch, TrackedMovie, TrackedShow } from "@/lib/library/queries";
import { loadLibrary } from "@/lib/library/queries";
import { lookupNextEpisode, watchedKeys, type NextLookup } from "@/lib/library/up-next";
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
          One tap marks the next episode of a show you are watching.
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

  return (
    <div className="grid gap-8">
      {queued.length === 0 ? (
        <p className="text-muted">
          Nothing is queued. Search for a show and set it to Watching.
        </p>
      ) : (
        <ul className="grid gap-3">
          {queued.map((item) => (
            <li key={item.show.tmdbId}>
              <QueuedShow show={item.show} next={item.next} />
            </li>
          ))}
        </ul>
      )}
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

function QueuedShow({
  show,
  next,
}: {
  show: TrackedShow;
  next: NextLookup;
}) {
  if (next.state === "error") {
    return (
      <div className="grid gap-2">
        <TitleLink
          href={`/tv/${show.tmdbId}`}
          title={show.title}
          posterUrl={show.posterUrl}
          meta="The next episode could not be loaded"
        />
        <p className="text-sm text-muted">{next.message}</p>
      </div>
    );
  }

  if (next.state === "caught_up") {
    return (
      <TitleLink
        href={`/tv/${show.tmdbId}`}
        title={show.title}
        posterUrl={show.posterUrl}
        meta="You are caught up"
      />
    );
  }

  const aired = formatAirDate(next.episode.airDate);
  const meta = [
    `S${next.episode.seasonNumber} E${next.episode.episodeNumber}`,
    next.episode.name,
    aired,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");

  return (
    <div className="grid gap-2">
      <TitleLink
        href={`/tv/${show.tmdbId}?season=${next.episode.seasonNumber}`}
        title={show.title}
        posterUrl={show.posterUrl}
        meta={meta}
      />
      <form action="/library/episode" method="post">
        <input type="hidden" name="showId" value={show.tmdbId} />
        <input type="hidden" name="season" value={next.episode.seasonNumber} />
        <input type="hidden" name="episode" value={next.episode.episodeNumber} />
        <input type="hidden" name="next" value="/up-next" />
        <button
          type="submit"
          name="intent"
          value="watch"
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink"
        >
          Mark watched
        </button>
      </form>
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
