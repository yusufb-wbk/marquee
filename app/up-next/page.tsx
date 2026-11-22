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
import { loadUpNextLibrary } from "@/lib/library/queries";
import { nextEpisodesFor, prefetchSchedules, type SavedSchedules, watchedKeys } from "@/lib/library/up-next";
import { requireUser } from "@/lib/require-user";
import { timed } from "@/lib/timed";

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
  // Saved schedules load alongside the library rather than after it.
  const schedules = prefetchSchedules(user.id);
  const { value: library, ms: libraryMs } = await timed(() => loadUpNextLibrary(user.id));
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
      {library.ok ? <Queue userId={user.id} schedules={schedules} library={library.data} libraryMs={libraryMs} /> : null}
    </div>
  );
}

async function Queue({
  userId,
  schedules,
  library,
  libraryMs,
}: {
  userId: string;
  schedules: Promise<SavedSchedules>;
  libraryMs: number;
  library: {
    shows: TrackedShow[];
    episodes: { showTmdbId: number; seasonNumber: number; episodeNumber: number }[];
  };
}) {
  const csrf = await readCsrfToken();
  const today = isoDateUTC(new Date());
  const episodesByShow = new Map<number, typeof library.episodes>();
  for (const episode of library.episodes) {
    const list = episodesByShow.get(episode.showTmdbId) ?? [];
    list.push(episode);
    episodesByShow.set(episode.showTmdbId, list);
  }
  // Watching shows, plus watchlist shows you have already started.
  const watching = library.shows.filter(
    (show) =>
      show.status === "watching" ||
      (show.status === "watchlist" && episodesByShow.has(show.tmdbId)),
  );
  const { value: lookup, ms: lookupMs } = await timed(() =>
    nextEpisodesFor(
      userId,
      watching.map((show) => ({
        tmdbId: show.tmdbId,
        watched: watchedKeys(episodesByShow.get(show.tmdbId) ?? []),
      })),
      schedules,
    ),
  );
  const queued = watching.map((show, index) => ({ show, next: lookup.next[index]! }));

  // One line per load, so slow pages can be traced to the database or to TMDB.
  const { saved, fetched, stale } = lookup.stats;
  console.info(
    `Up next: library ${libraryMs}ms, next episodes ${lookupMs}ms for ${watching.length} shows ` +
      `(${saved} saved, ${fetched} from TMDB, ${stale} to refresh)`,
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
