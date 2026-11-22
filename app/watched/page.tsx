import { Suspense } from "react";
import Link from "next/link";

import { readCsrfToken } from "@/components/csrf-field";
import { LibraryNotice } from "@/components/library-notice";
import { Message } from "@/components/message";
import { SchemaSetup } from "@/components/schema-setup";
import { WatchStats } from "@/components/watch-stats";
import { WatchedBrowser } from "@/components/watched-browser";
import { firstQueryValue } from "@/lib/format";
import { loadLibrary } from "@/lib/library/queries";
import { requireUser } from "@/lib/require-user";
import { buildWatchedTitles } from "@/lib/watched";

export const metadata = {
  title: "Watched",
};

type PageProps = {
  searchParams: Promise<{ library?: string | string[] }>;
};

export default function WatchedPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<p className="text-muted">Loading what you have watched…</p>}>
      <WatchedScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function WatchedScreen({ searchParams }: PageProps) {
  const user = await requireUser();
  const library = await loadLibrary(user.id);
  const code = firstQueryValue((await searchParams).library);

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="font-display text-4xl tracking-tight">Watched</h1>
        <p className="leading-7 text-muted">
          Hours, genres, and everything you have watched, with filters for type, year, and your rating.
        </p>
        <Link href="/import" className="text-sm font-semibold text-accent">
          Import from IMDb
        </Link>
      </header>
      <LibraryNotice code={code} />
      {!library.ok && library.error === "schema" ? <SchemaSetup /> : null}
      {!library.ok && library.error !== "schema" ? (
        <Message tone="error" title="Your watched list could not be loaded">
          Try again in a moment.
        </Message>
      ) : null}
      {library.ok ? (
        <WatchStats
          shows={library.data.shows}
          movies={library.data.movies}
          episodes={library.data.episodes}
        />
      ) : null}
      {library.ok ? (
        <WatchedBrowser
          csrf={await readCsrfToken()}
          titles={buildWatchedTitles({
            shows: library.data.shows,
            movies: library.data.movies,
            episodes: library.data.episodes,
          })}
        />
      ) : null}
    </div>
  );
}
