import { Suspense } from "react";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { readCsrfToken } from "@/components/csrf-field";
import { EpisodeList } from "@/components/episode-list";
import { LibraryNotice } from "@/components/library-notice";
import { Message } from "@/components/message";
import { CollapsibleText } from "@/components/collapsible-text";
import { PageSkeleton } from "@/components/page-skeleton";
import { Poster } from "@/components/poster";
import { SchemaSetup } from "@/components/schema-setup";
import { SeasonBrowser } from "@/components/season-browser";
import { SeasonNav } from "@/components/season-nav";
import { ShowStatusForm } from "@/components/show-status-form";
import { isoDateUTC } from "@/lib/calendar";
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
      <ShowHeader show={show} />
      {progress.ok || progress.error === "schema" ? (
        <ShowStatusForm
          showId={show.id}
          current={progress.ok ? (progress.data.show?.status ?? null) : null}
          rating={progress.ok ? (progress.data.show?.rating ?? null) : null}
          nextPath={nextPath}
        />
      ) : null}
      {show.seasons.length === 0 ? (
        <p className="text-muted">TMDB has no seasons for this show yet.</p>
      ) : (
        <div className="grid gap-4">
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
    <div className="flex items-start gap-4">
      <div className="shrink-0">
        <Poster src={show.posterUrl} title={show.name} size="large" />
      </div>
      <div className="grid min-w-0 flex-1 gap-2">
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">{show.name}</h1>
        {facts.length > 0 ? (
          <p className="text-sm text-muted">{facts.join(" · ")}</p>
        ) : null}
        {show.genres.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {show.genres.map((genre) => (
              <li
                key={genre}
                className="rounded-full border border-line px-2 py-1 text-xs text-muted"
              >
                {genre}
              </li>
            ))}
          </ul>
        ) : null}
        <CollapsibleText
          text={titleOverview(show.overview)}
          className="text-sm leading-6 text-muted"
        />
      </div>
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
