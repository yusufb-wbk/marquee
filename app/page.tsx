import { Suspense } from "react";
import type { Metadata } from "next";

import { Message } from "@/components/message";
import { ResultList } from "@/components/result-list";
import { SearchForm } from "@/components/search-form";
import { firstQueryValue } from "@/lib/format";
import { requireUser } from "@/lib/require-user";
import { searchTitles } from "@/lib/tmdb/client";

export const metadata: Metadata = {
  title: "Search",
};

type HomePageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default function HomePage({ searchParams }: HomePageProps) {
  return (
    <Suspense fallback={<p className="text-muted">Loading search…</p>}>
      <SearchScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchScreen({ searchParams }: HomePageProps) {
  await requireUser();
  const params = await searchParams;
  const query = firstQueryValue(params.q).trim();

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="font-display text-4xl tracking-tight">Find a title</h1>
        <p className="leading-7 text-muted">
          Search for a show or a movie. Open a show to see its seasons and
          episodes.
        </p>
      </header>
      <SearchForm query={query} />
      {query.length === 0 ? (
        <p className="text-muted">
          Try <span className="text-foreground">Breaking Bad</span>.
        </p>
      ) : query.length > 120 ? (
        <Message tone="error" title="That search is too long">
          Use 120 characters or fewer.
        </Message>
      ) : (
        <Suspense fallback={<p className="text-muted">Searching…</p>}>
          <SearchResults query={query} />
        </Suspense>
      )}
    </div>
  );
}

async function SearchResults({ query }: { query: string }) {
  const result = await searchTitles(query);
  if (!result.ok) {
    return (
      <Message tone="error" title="Search did not finish">
        {result.error.message}
      </Message>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">
        {result.data.length === 1
          ? "1 title"
          : `${result.data.length} titles`}
      </p>
      <ResultList titles={result.data} />
    </div>
  );
}
