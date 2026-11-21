import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LibraryNotice } from "@/components/library-notice";
import { Message } from "@/components/message";
import { MovieStatusForm } from "@/components/movie-status-form";
import { CollapsibleText } from "@/components/collapsible-text";
import { Poster } from "@/components/poster";
import { SchemaSetup } from "@/components/schema-setup";
import { firstQueryValue, formatRuntime, parsePositiveInt } from "@/lib/format";
import { titleOverview } from "@/lib/overview";
import { loadMovieProgress } from "@/lib/library/queries";
import { requireUser } from "@/lib/require-user";
import { getMovie } from "@/lib/tmdb/client";
import type { Movie } from "@/lib/tmdb/types";

type MoviePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ library?: string | string[] }>;
};

export const metadata = {
  title: "Movie",
};

export default function MoviePage({ params, searchParams }: MoviePageProps) {
  return (
    <Suspense fallback={<p className="text-muted">Loading movie…</p>}>
      <MovieScreen params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function MovieScreen({ params, searchParams }: MoviePageProps) {
  const user = await requireUser();
  const id = parsePositiveInt((await params).id);
  if (id === null) {
    notFound();
  }

  const result = await getMovie(id);
  if (!result.ok) {
    if (result.error.kind === "not_found") {
      notFound();
    }
    return (
      <Message tone="error" title="This movie could not be loaded">
        {result.error.message}
      </Message>
    );
  }

  const progress = await loadMovieProgress(user.id, result.data.id);
  const tracked = progress.ok ? progress.data : null;
  const libraryCode = firstQueryValue((await searchParams).library);

  return (
    <div className="grid gap-6">
      <Link href="/up-next" className="text-sm text-muted">
        Back to up next
      </Link>
      <LibraryNotice code={libraryCode} />
      {!progress.ok && progress.error === "schema" ? <SchemaSetup /> : null}
      {!progress.ok && progress.error !== "schema" ? (
        <Message tone="error" title="Your list could not be loaded">
          Try again in a moment.
        </Message>
      ) : null}
      <MovieHeader movie={result.data} />
      {progress.ok || progress.error === "schema" ? (
        <MovieStatusForm
          movieId={result.data.id}
          status={tracked?.status ?? null}
          watchedOn={tracked?.watchedOn ?? null}
          rating={tracked?.rating ?? null}
          nextPath={`/movie/${result.data.id}`}
        />
      ) : null}
    </div>
  );
}

function MovieHeader({ movie }: { movie: Movie }) {
  const runtime = formatRuntime(movie.runtime);
  const facts = [movie.year, runtime, movie.status, ...movie.genres].filter(
    (fact): fact is string => Boolean(fact),
  );

  return (
    <div className="flex flex-col gap-5 md:flex-row">
      <Poster src={movie.posterUrl} title={movie.title} size="large" />
      <div className="grid gap-3">
        <p className="text-xs uppercase tracking-wide text-muted">Movie</p>
        <h1 className="font-display text-4xl tracking-tight">{movie.title}</h1>
        {facts.length > 0 ? (
          <p className="text-sm text-muted">{facts.join(" · ")}</p>
        ) : null}
        <CollapsibleText
          text={titleOverview(movie.overview)}
          className="leading-7 text-muted"
        />
      </div>
    </div>
  );
}
