import { Suspense } from "react";
import Link from "next/link";

import { LibraryNotice } from "@/components/library-notice";
import { Message } from "@/components/message";
import { SchemaSetup } from "@/components/schema-setup";
import { addCalendarDays, isOnOrBetween, isoDateUTC } from "@/lib/calendar";
import { firstQueryValue, formatAirDate } from "@/lib/format";
import { loadLibrary } from "@/lib/library/queries";
import { requireUser } from "@/lib/require-user";
import { getTvShow } from "@/lib/tmdb/client";

export const metadata = {
  title: "Upcoming",
};

type PageProps = {
  searchParams: Promise<{ library?: string | string[] }>;
};

export default function UpcomingPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<p className="text-muted">Loading upcoming episodes…</p>}>
      <UpcomingScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function UpcomingScreen({ searchParams }: PageProps) {
  const user = await requireUser();
  const library = await loadLibrary(user.id);
  const code = firstQueryValue((await searchParams).library);
  const today = isoDateUTC(new Date());
  const end = addCalendarDays(today, 30);

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="font-display text-4xl tracking-tight">Upcoming</h1>
        <p className="leading-7 text-muted">
          New episodes from shows you are watching, for the next 30 days.
        </p>
      </header>
      <LibraryNotice code={code} />
      {!library.ok && library.error === "schema" ? <SchemaSetup /> : null}
      {!library.ok && library.error !== "schema" ? (
        <Message tone="error" title="Your list could not be loaded">
          Try again in a moment.
        </Message>
      ) : null}
      {library.ok && end ? (
        <Calendar
          showIds={library.data.shows
            .filter((show) => show.status === "watching")
            .map((show) => ({ id: show.tmdbId, title: show.title }))}
          today={today}
          end={end}
        />
      ) : null}
    </div>
  );
}

async function Calendar({
  showIds,
  today,
  end,
}: {
  showIds: { id: number; title: string }[];
  today: string;
  end: string;
}) {
  if (showIds.length === 0) {
    return (
      <p className="text-muted">
        No shows are set to Watching.{" "}
        <Link href="/" className="text-foreground">
          Search for one
        </Link>
        .
      </p>
    );
  }

  const loaded = await Promise.all(
    showIds.map(async (show) => {
      const detail = await getTvShow(show.id);
      return { show, detail };
    }),
  );

  const failed = loaded.filter((item) => !item.detail.ok);
  const airing = loaded.flatMap((item) => {
    if (!item.detail.ok || !item.detail.data.nextEpisode?.airDate) {
      return [];
    }
    const episode = item.detail.data.nextEpisode;
    if (!episode.airDate || !isOnOrBetween(episode.airDate, today, end)) {
      return [];
    }
    return [
      {
        showId: item.show.id,
        showTitle: item.show.title,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        name: episode.name,
        airDate: episode.airDate,
      },
    ];
  });
  airing.sort((a, b) => a.airDate.localeCompare(b.airDate) || a.showTitle.localeCompare(b.showTitle));

  const dates = [...new Set(airing.map((item) => item.airDate))];

  return (
    <div className="grid gap-6">
      {failed.length > 0 ? (
        <Message tone="error" title="Some shows could not be checked">
          {failed.length === 1
            ? "One show did not load from TMDB."
            : `${failed.length} shows did not load from TMDB.`}
        </Message>
      ) : null}
      {dates.length === 0 ? (
        <p className="text-muted">No new episodes in the next 30 days.</p>
      ) : (
        dates.map((date) => (
          <section key={date} className="grid gap-3">
            <h2 className="font-display text-2xl">{formatAirDate(date) ?? date}</h2>
            <ul className="grid gap-2">
              {airing
                .filter((item) => item.airDate === date)
                .map((item) => (
                  <li key={`${item.showId}-${item.seasonNumber}-${item.episodeNumber}`}>
                    <Link
                      href={`/tv/${item.showId}?season=${item.seasonNumber}`}
                      className="grid gap-1 rounded-2xl border border-line bg-card px-4 py-3"
                    >
                      <span className="font-semibold">{item.showTitle}</span>
                      <span className="text-sm text-muted">
                        S{item.seasonNumber} E{item.episodeNumber} · {item.name}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
