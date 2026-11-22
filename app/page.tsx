import { Suspense } from "react";
import type { Metadata } from "next";

import { Message } from "@/components/message";
import { PageSkeleton } from "@/components/page-skeleton";
import { ResultList } from "@/components/result-list";
import { SearchForm } from "@/components/search-form";
import { firstQueryValue } from "@/lib/format";
import { requireUser } from "@/lib/require-user";
import { normalizeSearchQuery } from "@/lib/search-query";
import { searchTitles } from "@/lib/tmdb/client";

export const metadata: Metadata = {
  title: "Search",
};

type HomePageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default function HomePage({ searchParams }: HomePageProps) {
  return (
    <Suspense fallback={<PageSkeleton kind="browse" />}>
      <SearchScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchScreen({ searchParams }: HomePageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const raw = firstQueryValue(params.q).trim().replace(/\s+/g, " ");
  const query = normalizeSearchQuery(raw);

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="font-display text-4xl tracking-tight">Find a title</h1>
        <p className="leading-7 text-muted">
          Search for a show or a movie, then add it to your list.
        </p>
      </header>
      <SearchForm key={raw} query={query ?? raw} />
      {query === null && raw.length > 0 ? (
        <Message tone="error" title="That search cannot be sent">
          Use 2 to 80 characters.
        </Message>
      ) : query ? (
        <Suspense fallback={<PageSkeleton kind="results" />}>
          <SearchResults query={query} userId={user.id} />
        </Suspense>
      ) : null}
    </div>
  );
}

async function SearchResults({
  query,
  userId,
}: {
  query: string;
  userId: string;
}) {
  const result = await searchTitles(query, userId);
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
