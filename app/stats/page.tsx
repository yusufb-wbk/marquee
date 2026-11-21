import { Suspense } from "react";
import Link from "next/link";

import { LibraryNotice } from "@/components/library-notice";
import { Message } from "@/components/message";
import { SchemaSetup } from "@/components/schema-setup";
import { firstQueryValue } from "@/lib/format";
import { loadLibrary } from "@/lib/library/queries";
import { requireUser } from "@/lib/require-user";
import { formatHours, summarizeWatching } from "@/lib/stats";

export const metadata = {
  title: "Stats",
};

type PageProps = {
  searchParams: Promise<{ library?: string | string[] }>;
};

export default function StatsPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<p className="text-muted">Loading stats…</p>}>
      <StatsScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function StatsScreen({ searchParams }: PageProps) {
  const user = await requireUser();
  const library = await loadLibrary(user.id);
  const code = firstQueryValue((await searchParams).library);

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="font-display text-4xl tracking-tight">Stats</h1>
        <p className="leading-7 text-muted">
          Hours, episodes, movies, and the genres you watch most.
        </p>
      </header>
      <LibraryNotice code={code} />
      {!library.ok && library.error === "schema" ? <SchemaSetup /> : null}
      {!library.ok && library.error !== "schema" ? (
        <Message tone="error" title="Your stats could not be loaded">
          Try again in a moment.
        </Message>
      ) : null}
      {library.ok ? (
        <StatsBody
          shows={library.data.shows}
          movies={library.data.movies}
          episodes={library.data.episodes}
        />
      ) : null}
      <Link href="/up-next" className="text-sm text-muted">
        Back to up next
      </Link>
    </div>
  );
}

function StatsBody({
  shows,
  movies,
  episodes,
}: {
  shows: { tmdbId: number; genres: string[] }[];
  movies: { status: string; genres: string[]; runtimeMinutes: number | null }[];
  episodes: { showTmdbId: number; runtimeMinutes: number | null }[];
}) {
  const showIds = new Set(shows.map((show) => show.tmdbId));
  const stats = summarizeWatching({
    shows: [
      ...shows.map((show) => ({
        genres: show.genres,
        episodes: episodes
          .filter((episode) => episode.showTmdbId === show.tmdbId)
          .map((episode) => ({ runtimeMinutes: episode.runtimeMinutes })),
      })),
      {
        genres: [],
        episodes: episodes
          .filter((episode) => !showIds.has(episode.showTmdbId))
          .map((episode) => ({ runtimeMinutes: episode.runtimeMinutes })),
      },
    ],
    movies: movies
      .filter((movie) => movie.status === "watched")
      .map((movie) => ({
        genres: movie.genres,
        runtimeMinutes: movie.runtimeMinutes,
      })),
  });

  const missing = stats.episodesMissingRuntime + stats.moviesMissingRuntime;

  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Hours" value={formatHours(stats.minutes)} />
        <Stat label="Episodes" value={String(stats.episodeCount)} />
        <Stat label="Movies" value={String(stats.movieCount)} />
      </dl>
      {missing > 0 ? (
        <p className="text-sm text-muted">
          {missing === 1
            ? "1 title has no runtime on TMDB, so it is not in the hours."
            : `${missing} titles have no runtime on TMDB, so they are not in the hours.`}
        </p>
      ) : null}
      <section className="grid gap-2">
        <h2 className="font-display text-2xl">Top genres</h2>
        {stats.topGenres.length === 0 ? (
          <p className="text-muted">
            Genres show up after you watch an episode or a movie.
          </p>
        ) : (
          <ol className="grid gap-2">
            {stats.topGenres.map((genre) => (
              <li
                key={genre.name}
                className="flex items-baseline justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3"
              >
                <span className="font-medium">{genre.name}</span>
                <span className="text-sm tabular-nums text-muted">
                  {genre.count}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-2xl border border-line bg-card px-3 py-4">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="font-display text-3xl tabular-nums">{value}</dd>
    </div>
  );
}
