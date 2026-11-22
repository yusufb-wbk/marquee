import { Suspense } from "react";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { readCsrfToken } from "@/components/csrf-field";
import { EpisodeList } from "@/components/episode-list";
import { LibraryNotice } from "@/components/library-notice";
import { Message } from "@/components/message";
import { PageSkeleton } from "@/components/page-skeleton";
import { SchemaSetup } from "@/components/schema-setup";
import { TitleStage } from "@/components/title-stage";
import { SeasonBrowser } from "@/components/season-browser";
import { SeasonNav } from "@/components/season-nav";
import { ShowStatusForm } from "@/components/show-status-form";
import { isoDateUTC } from "@/lib/calendar";
import { seriesFinished } from "@/lib/progress";
import {
  firstQueryValue,
  parsePositiveInt,
  parseSeasonNumber,
} from "@/lib/format";
import { titleOverview } from "@/lib/overview";
import { loadShowProgress, type EpisodeWatch } from "@/lib/library/queries";
import { requireUser } from "@/lib/require-user";
import { getTvSeason, getTvShow } from "@/lib/tmdb/client";
import type { SeasonSummary, TvShow } from "@/lib/tmdb/types";

type TvPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string | string[]; library?: string | string[] }>;
};

export const metadata = {
  title: "Show",
};

export default function TvPage({ params, searchParams }: TvPageProps) {
  return (
    <Suspense fallback={<PageSkeleton kind="detail" />}>
      <TvScreen params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function TvScreen({ params, searchParams }: TvPageProps) {
  const user = await requireUser();
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
  const query = await searchParams;
  const requestedRaw = firstQueryValue(query.season).trim();
  const libraryCode = firstQueryValue(query.library);
  const requested =
    requestedRaw.length > 0 ? parseSeasonNumber(requestedRaw) : null;
  const active = chooseSeason(show.seasons, requestedRaw, requested);
  const progress = await loadShowProgress(user.id, show.id);
  const nextPath = active
    ? `/tv/${show.id}?season=${active.seasonNumber}`
    : `/tv/${show.id}`;

  return (
    <div className="grid gap-6">
      <BackButton />
      <LibraryNotice code={libraryCode} />
      {!progress.ok && progress.error === "schema" ? <SchemaSetup /> : null}
      {!progress.ok && progress.error !== "schema" ? (
        <Message tone="error" title="Your progress could not be loaded">
          The episode list is still here. Tracking changes may not save.
        </Message>
      ) : null}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <ShowHeader show={show} />
        {progress.ok || progress.error === "schema" ? (
          <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <ShowStatusForm
              showId={show.id}
              current={progress.ok ? (progress.data.show?.status ?? null) : null}
              rating={progress.ok ? (progress.data.show?.rating ?? null) : null}
              nextPath={nextPath}
              finished={seriesFinished(
                show.status,
                show.seasons,
                progress.ok ? progress.data.episodes : [],
              )}
            />
          </div>
        ) : null}
      {show.seasons.length === 0 ? (
        <p className="text-muted">TMDB has no seasons for this show yet.</p>
      ) : (
        <div className="grid gap-4 lg:col-start-1">
          {progress.ok ? null : (
            <SeasonNav
              showId={show.id}
              seasons={show.seasons}
              activeSeason={active?.seasonNumber ?? null}
            />
          )}
          {active && progress.ok ? (
            <Suspense fallback={<PageSkeleton kind="episodes" />}>
              <TrackedSeason
                showId={show.id}
                seasons={show.seasons}
                season={active}
                watches={progress.data.episodes}
                showTracked={progress.data.show !== null}
              />
            </Suspense>
          ) : active ? (
            <Suspense fallback={<PageSkeleton kind="episodes" />}>
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
  const facts = [show.year, show.status].filter((fact): fact is string => Boolean(fact));

  return (
    <div className="lg:col-start-1 lg:row-start-1">
      <TitleStage
        kind="Show"
        title={show.name}
        posterUrl={show.posterUrl}
        backdropUrl={show.backdropUrl}
        facts={facts}
        genres={show.genres}
        overview={titleOverview(show.overview)}
      />
    </div>
  );
}

async function TrackedSeason({
  showId,
  seasons,
  season,
  watches,
  showTracked,
}: {
  showId: number;
  seasons: SeasonSummary[];
  season: SeasonSummary;
  watches: EpisodeWatch[];
  showTracked: boolean;
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

  const csrf = await readCsrfToken();
  return (
    <SeasonBrowser
      csrf={csrf}
      showId={showId}
      seasons={seasons}
      initialSeasonNumber={season.seasonNumber}
      initialSeasonName={result.data.name}
      initialEpisodes={result.data.episodes}
      initialWatched={watches}
      showTracked={showTracked}
      today={isoDateUTC(new Date())}
    />
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

  return (
    <section className="grid gap-2">
      <h2 className="font-display text-2xl">{result.data.name}</h2>
      <EpisodeList episodes={result.data.episodes} />
    </section>
  );
}
