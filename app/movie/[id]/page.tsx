import { Suspense } from "react";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { LibraryNotice } from "@/components/library-notice";
import { Message } from "@/components/message";
import { MovieStatusForm } from "@/components/movie-status-form";
import { PageSkeleton } from "@/components/page-skeleton";
import { RatingsStrip, RatingsStripSkeleton } from "@/components/ratings-strip";
import { SchemaSetup } from "@/components/schema-setup";
import { TitleCredits, TitleCreditsSkeleton } from "@/components/title-credits";
import { TitleStage } from "@/components/title-stage";
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
    <Suspense fallback={<PageSkeleton kind="detail" />}>
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
      <BackButton />
      <LibraryNotice code={libraryCode} />
      {!progress.ok && progress.error === "schema" ? <SchemaSetup /> : null}
      {!progress.ok && progress.error !== "schema" ? (
        <Message tone="error" title="Your list could not be loaded">
          Try again in a moment.
        </Message>
      ) : null}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid gap-3">
          <MovieHeader movie={result.data} />
          <Suspense fallback={<RatingsStripSkeleton />}>
            <RatingsStrip kind="movie" id={result.data.id} />
          </Suspense>
        </div>
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
      <Suspense fallback={<TitleCreditsSkeleton />}>
        <TitleCredits kind="movie" id={result.data.id} title={result.data.title} />
      </Suspense>
    </div>
  );
}

function MovieHeader({ movie }: { movie: Movie }) {
  const runtime = formatRuntime(movie.runtime);
  const details = [movie.year, runtime, movie.status].filter(
    (fact): fact is string => Boolean(fact),
  );

  return (
    <TitleStage
      kind="Movie"
      title={movie.title}
      posterUrl={movie.posterUrl}
      backdropUrl={movie.backdropUrl}
      facts={details}
      genres={movie.genres}
      overview={titleOverview(movie.overview)}
    />
  );
}
