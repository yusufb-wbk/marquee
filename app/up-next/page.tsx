import { Suspense } from "react";

import { readCsrfToken } from "@/components/csrf-field";
import { LibraryNotice } from "@/components/library-notice";
import { Message } from "@/components/message";
import { PageSkeleton } from "@/components/page-skeleton";
import { UpNextQueue } from "@/components/up-next-queue";
import { SchemaSetup } from "@/components/schema-setup";
import { isoDateUTC, showsAiringThisYear } from "@/lib/calendar";
import { firstQueryValue } from "@/lib/format";
import type { TrackedShow } from "@/lib/library/queries";
import { loadLibrary } from "@/lib/library/queries";
import { lookupNextEpisode, watchedKeys } from "@/lib/library/up-next";
import { requireUser } from "@/lib/require-user";
import { mapWithLimit } from "@/lib/concurrency";

const UP_NEXT_CONCURRENCY = 8;

export const metadata = {
  title: "Up next",
};

type PageProps = {
  searchParams: Promise<{ library?: string | string[] }>;
};

export default function UpNextPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton kind="queue" />}>
      <UpNextScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function UpNextScreen({ searchParams }: PageProps) {
  const user = await requireUser();
  const library = await loadLibrary(user.id);
  const code = firstQueryValue((await searchParams).library);

  return (
    <div className="grid gap-8">
      <h1 className="font-display text-4xl tracking-tight">Up next</h1>
      <LibraryNotice code={code} />
      {!library.ok && library.error === "schema" ? <SchemaSetup /> : null}
      {!library.ok && library.error !== "schema" ? (
        <Message tone="error" title="Your list could not be loaded">
          Try again in a moment.
        </Message>
      ) : null}
      {library.ok ? <Queue library={library.data} /> : null}
    </div>
  );
}

async function Queue({
  library,
}: {
  library: {
    shows: TrackedShow[];
    episodes: { showTmdbId: number; seasonNumber: number; episodeNumber: number }[];
  };
}) {
  const csrf = await readCsrfToken();
  const today = isoDateUTC(new Date());
  const watching = library.shows.filter((show) => show.status === "watching");
  // A few shows at a time, so a long list does not fire hundreds of TMDB requests at once.
  const queued = await mapWithLimit(
    watching,
    UP_NEXT_CONCURRENCY,
    async (show) => {
      const keys = watchedKeys(
        library.episodes.filter((episode) => episode.showTmdbId === show.tmdbId),
      );
      const next = await lookupNextEpisode(show.tmdbId, keys);
      return { show, next };
    },
  );

  const waiting = showsAiringThisYear(queued, today).slice().sort(byAirDate);
  // Shows whose next episode could not be loaded (often TMDB pacing) are not "nothing to watch".
  const unavailable = queued.filter((item) => item.next.state === "error").length;
  return (
    <UpNextQueue
      csrf={csrf}
      hadWatching={watching.length > 0}
      unavailable={unavailable}
      today={today}
      items={waiting.map((item) => ({
        showId: item.show.tmdbId,
        title: item.show.title,
        posterUrl: item.show.posterUrl,
        next: item.next,
      }))}
    />
  );
}

function byAirDate(
  left: { next: { state: string; episode?: { airDate: string | null } } },
  right: { next: { state: string; episode?: { airDate: string | null } } },
): number {
  const leftDate = left.next.state === "ready" ? (left.next.episode?.airDate ?? "") : "";
  const rightDate = right.next.state === "ready" ? (right.next.episode?.airDate ?? "") : "";
  return leftDate.localeCompare(rightDate);
}
