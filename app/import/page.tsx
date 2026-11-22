import { Suspense } from "react";
import Link from "next/link";

import { readCsrfToken } from "@/components/csrf-field";
import { ImdbImportForm } from "@/components/imdb-import-form";
import { PageSkeleton } from "@/components/page-skeleton";
import { firstQueryValue } from "@/lib/format";
import { requireUser } from "@/lib/require-user";

export const metadata = {
  title: "Import from IMDb",
};

type ImportPageProps = {
  searchParams: Promise<{ list?: string | string[] }>;
};

export default function ImportPage({ searchParams }: ImportPageProps) {
  return (
    <Suspense fallback={<PageSkeleton kind="form" />}>
      <ImportScreen searchParams={searchParams} />
    </Suspense>
  );
}

async function ImportScreen({ searchParams }: ImportPageProps) {
  await requireUser();
  const csrf = await readCsrfToken();
  const watchlist = firstQueryValue((await searchParams).list) === "watchlist";
  const list = watchlist ? "watchlist" : "ratings";

  return (
    <div className="grid gap-6">
      <header className="grid gap-4">
        <Link
          href={watchlist ? "/watchlist" : "/watched"}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <span aria-hidden="true">←</span>
          {watchlist ? "Watchlist" : "Watched"}
        </Link>
        <h1 className="font-display text-4xl tracking-tight">Import from IMDb</h1>
      </header>

      <ol className="grid gap-2">
        <Step number={1}>
          On IMDb, open your {list} and tap <span className="font-semibold text-foreground">Export</span>.
        </Step>
        <Step number={2}>Upload the CSV file here.</Step>
      </ol>

      <ImdbImportForm csrf={csrf} />
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
