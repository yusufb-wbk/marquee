import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Message } from "@/components/message";
import { Poster } from "@/components/poster";
import { formatRuntime, parsePositiveInt } from "@/lib/format";
import { requireUser } from "@/lib/require-user";
import { getMovie } from "@/lib/tmdb/client";
import type { Movie } from "@/lib/tmdb/types";

type MoviePageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Movie",
};

export default function MoviePage({ params }: MoviePageProps) {
  return (
    <Suspense fallback={<p className="text-muted">Loading movie…</p>}>
      <MovieScreen params={params} />
    </Suspense>
  );
}

async function MovieScreen({ params }: MoviePageProps) {
  await requireUser();
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

  return (
    <div className="grid gap-6">
      <Link href="/" className="text-sm text-muted">
        Back to search
      </Link>
      <MovieHeader movie={result.data} />
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
        <p className="leading-7 text-muted">
          {movie.overview.length > 0
            ? movie.overview
            : "No summary from TMDB."}
        </p>
      </div>
    </div>
  );
}
