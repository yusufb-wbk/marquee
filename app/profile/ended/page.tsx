import { Suspense } from "react";

import { BackButton } from "@/components/back-button";
import { Message } from "@/components/message";
import { PageSkeleton } from "@/components/page-skeleton";
import { SchemaSetup } from "@/components/schema-setup";
import { TitleLink } from "@/components/title-link";
import { loadEndedTitles } from "@/lib/library/ended";
import { loadLibrary } from "@/lib/library/queries";
import { requireUser } from "@/lib/require-user";

export const metadata = {
  title: "Ended",
};

export default function EndedPage() {
  return (
    <Suspense fallback={<PageSkeleton kind="browse" />}>
      <EndedScreen />
    </Suspense>
  );
}

async function EndedScreen() {
  const user = await requireUser();
  const library = await loadLibrary(user.id);

  return (
    <div className="grid gap-6">
      <BackButton fallback="/profile" />
      <h1 className="font-display text-4xl tracking-tight">Ended</h1>
      {!library.ok && library.error === "schema" ? <SchemaSetup /> : null}
      {!library.ok && library.error !== "schema" ? (
        <Message tone="error" title="Ended shows could not be loaded">
          Try again in a moment.
        </Message>
      ) : null}
      {library.ok ? (
        <EndedList
          shows={library.data.shows}
          episodes={library.data.episodes}
        />
      ) : null}
    </div>
  );
}

async function EndedList({
  shows,
  episodes,
}: {
  shows: Parameters<typeof loadEndedTitles>[0];
  episodes: Parameters<typeof loadEndedTitles>[1];
}) {
  const titles = await loadEndedTitles(shows, episodes);
  if (titles.length === 0) {
    return <p className="text-muted">Nothing has ended.</p>;
  }

  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {titles.map((title) => (
        <li key={title.id}>
          <TitleLink
            href={title.href}
            title={title.title}
            posterUrl={title.posterUrl}
            meta={title.meta}
          />
        </li>
      ))}
    </ul>
  );
}
