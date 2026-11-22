import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BackButton } from "@/components/back-button";
import { Message } from "@/components/message";
import { PageSkeleton } from "@/components/page-skeleton";
import { TrendingBrowser } from "@/components/trending-browser";
import { requireUser } from "@/lib/require-user";
import { listTrending } from "@/lib/tmdb/client";
import type { MediaType } from "@/lib/tmdb/types";

const KINDS = {
  movies: { mediaType: "movie", title: "Trending movies" },
  shows: { mediaType: "tv", title: "Trending shows" },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  const known = kind === "movies" || kind === "shows" ? KINDS[kind] : null;
  return { title: known?.title ?? "Trending" };
}

export default function TrendingPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton kind="browse" />}>
      <TrendingScreen params={params} />
    </Suspense>
  );
}

async function TrendingScreen({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  await requireUser();
  const { kind } = await params;
  if (kind !== "movies" && kind !== "shows") {
    notFound();
  }
  const section = KINDS[kind];
  const mediaType: MediaType = section.mediaType;
  const result = await listTrending(mediaType, 3);

  return (
    <div className="grid gap-6">
      <BackButton fallback="/" />
      <h1 className="font-display text-4xl tracking-tight">{section.title}</h1>
      {result.ok ? (
        <TrendingBrowser titles={result.data} />
      ) : (
        <Message tone="error" title="This list could not be loaded">
          {result.error.message}
        </Message>
      )}
    </div>
  );
}
