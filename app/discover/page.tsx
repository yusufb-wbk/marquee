import { Suspense } from "react";

import { Message } from "@/components/message";
import { ResultList } from "@/components/result-list";
import { requireUser } from "@/lib/require-user";
import { listPopular, listTrending } from "@/lib/tmdb/client";
import type { SearchTitle, TmdbResult } from "@/lib/tmdb/types";

export const metadata = {
  title: "Discover",
};

export default function DiscoverPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading discover…</p>}>
      <DiscoverScreen />
    </Suspense>
  );
}

async function DiscoverScreen() {
  await requireUser();
  const [trending, shows, movies] = await Promise.all([
    listTrending(),
    listPopular("tv"),
    listPopular("movie"),
  ]);

  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <h1 className="font-display text-4xl tracking-tight">Discover</h1>
        <p className="leading-7 text-muted">
          Trending this week, plus popular shows and movies from TMDB.
        </p>
      </header>
      <DiscoverSection title="Trending this week" result={trending} />
      <DiscoverSection title="Popular shows" result={shows} />
      <DiscoverSection title="Popular movies" result={movies} />
    </div>
  );
}

function DiscoverSection({
  title,
  result,
}: {
  title: string;
  result: TmdbResult<SearchTitle[]>;
}) {
  return (
    <section className="grid gap-3">
      <h2 className="font-display text-2xl">{title}</h2>
      {result.ok ? (
        <ResultList titles={result.data} />
      ) : (
        <Message tone="error" title="This list could not be loaded">
          {result.error.message}
        </Message>
      )}
    </section>
  );
}
