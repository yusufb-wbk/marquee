import { Suspense } from "react";
import Link from "next/link";

import { readCsrfToken } from "@/components/csrf-field";
import { ImdbImportForm } from "@/components/imdb-import-form";
import { PageSkeleton } from "@/components/page-skeleton";
import { requireUser } from "@/lib/require-user";

export const metadata = {
  title: "Import from IMDb",
};

export default function ImdbImportPage() {
  return (
    <Suspense fallback={<PageSkeleton kind="form" />}>
      <ImdbImportScreen />
    </Suspense>
  );
}

async function ImdbImportScreen() {
  await requireUser();
  const csrf = await readCsrfToken();

  return (
    <div className="grid max-w-2xl gap-6">
      <header className="grid gap-4">
        <Link
          href="/import"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <span aria-hidden="true">←</span>
          Import
        </Link>
        <h1 className="font-display text-4xl tracking-tight">Import from IMDb</h1>
      </header>

      <ol className="grid gap-2">
        <Step number={1}>
          On IMDb, open <span className="font-semibold text-foreground">Your ratings</span> or{" "}
          <span className="font-semibold text-foreground">Your watchlist</span> and tap{" "}
          <span className="font-semibold text-foreground">Export</span>.
        </Step>
        <Step number={2}>When IMDb has the file ready, download the CSV.</Step>
        <Step number={3}>Upload it here. Do the same for the other list if you want both.</Step>
      </ol>

      <ImdbImportForm csrf={csrf} />

      <dl className="grid gap-3 rounded-2xl border border-line p-4 text-sm">
        <div className="grid gap-0.5">
          <dt className="font-semibold">Ratings file</dt>
          <dd className="text-muted">
            Movies become Watched. Shows become Watching with every aired episode marked; unmark
            seasons on the show page if you stopped early.
          </dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="font-semibold">Watchlist file</dt>
          <dd className="text-muted">Movies and shows go to your Watchlist.</dd>
        </div>
      </dl>
    </div>
  );
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-ink">
        {number}
      </span>
      <span className="text-sm leading-6 text-muted">{children}</span>
    </li>
  );
}
