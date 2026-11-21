import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EpisodeList } from "@/components/episode-list";
import { Message } from "@/components/message";
import { Poster } from "@/components/poster";
import { SeasonNav } from "@/components/season-nav";
import {
  firstQueryValue,
  formatAirDate,
  parsePositiveInt,
  parseSeasonNumber,
} from "@/lib/format";
import { requireUser } from "@/lib/require-user";
import { getTvSeason, getTvShow } from "@/lib/tmdb/client";
import type { SeasonSummary, TvShow } from "@/lib/tmdb/types";

type TvPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string | string[] }>;
};

export const metadata = {
  title: "Show",
};

export default function TvPage({ params, searchParams }: TvPageProps) {
  return (
    <Suspense fallback={<p className="text-muted">Loading show…</p>}>
      <TvScreen params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function TvScreen({ params, searchParams }: TvPageProps) {
  await requireUser();
  const id = parsePositiveInt((await params).id);
  if (id === null) {
    notFound();
  }

  const showResult = await getTvShow(id);
  if (!showResult.ok) {
    if (showResult.error.kind === "not_found") {
      notFound();
    }
    return (
      <Message tone="error" title="This show could not be loaded">
        {showResult.error.message}
      </Message>
    );
  }

  const show = showResult.data;
  const requestedRaw = firstQueryValue((await searchParams).season).trim();
  const requested =
    requestedRaw.length > 0 ? parseSeasonNumber(requestedRaw) : null;
  const active = chooseSeason(show.seasons, requestedRaw, requested);

  return (
    <div className="grid gap-6">
      <Link href="/" className="text-sm text-muted">
        Back to search
      </Link>
      <ShowHeader show={show} />
      {show.seasons.length === 0 ? (
        <p className="text-muted">TMDB has no seasons for this show yet.</p>
      ) : (
        <div className="grid gap-4">
          <SeasonNav
            showId={show.id}
            seasons={show.seasons}
            activeSeason={active?.seasonNumber ?? null}
          />
          {active ? (
            <Suspense fallback={<p className="text-muted">Loading episodes…</p>}>
              <SeasonEpisodes showId={show.id} season={active} />
            </Suspense>
          ) : (
            <Message tone="error" title="That season is not listed">
              Choose one of the seasons above.
            </Message>
          )}
        </div>
      )}
    </div>
  );
}

function chooseSeason(
  seasons: SeasonSummary[],
  requestedRaw: string,
  requested: number | null,
): SeasonSummary | null {
  if (requestedRaw.length > 0) {
    if (requested === null) {
      return null;
    }
    return seasons.find((season) => season.seasonNumber === requested) ?? null;
  }
  return (
    seasons.find((season) => season.seasonNumber > 0) ?? seasons[0] ?? null
  );
}

function ShowHeader({ show }: { show: TvShow }) {
  const facts = [show.year, show.status, ...show.genres].filter(
    (fact): fact is string => Boolean(fact),
  );

  return (
    <div className="flex flex-col gap-5 md:flex-row">
      <Poster src={show.posterUrl} title={show.name} size="large" />
      <div className="grid gap-3">
        <h1 className="font-display text-4xl tracking-tight">{show.name}</h1>
        {facts.length > 0 ? (
          <p className="text-sm text-muted">{facts.join(" · ")}</p>
        ) : null}
        <p className="leading-7 text-muted">
          {show.overview.length > 0 ? show.overview : "No summary from TMDB."}
        </p>
      </div>
    </div>
  );
}

async function SeasonEpisodes({
  showId,
  season,
}: {
  showId: number;
  season: SeasonSummary;
}) {
  const result = await getTvSeason(showId, season.seasonNumber);
  if (!result.ok) {
    if (result.error.kind === "not_found") {
      return (
        <Message tone="error" title="That season is not listed">
          TMDB has no episode list for {season.name}.
        </Message>
      );
    }
    return (
      <Message tone="error" title="Episodes could not be loaded">
        {result.error.message}
      </Message>
    );
  }

  const aired = formatAirDate(season.airDate);
  const countLabel =
    result.data.episodes.length === 1
      ? "1 episode"
      : `${result.data.episodes.length} episodes`;

  return (
    <section className="grid gap-2">
      <h2 className="font-display text-2xl">{result.data.name}</h2>
      <p className="text-sm text-muted">
        {[countLabel, aired].filter((part): part is string => Boolean(part)).join(" · ")}
      </p>
      <EpisodeList episodes={result.data.episodes} />
    </section>
  );
}
