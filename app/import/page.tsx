import { Suspense } from "react";
import Link from "next/link";

import { ChevronLeftIcon } from "@/components/icons";
import { PageSkeleton } from "@/components/page-skeleton";
import { requireUser } from "@/lib/require-user";

export const metadata = {
  title: "Import",
};

export default function ImportPage() {
  return (
    <Suspense fallback={<PageSkeleton kind="form" />}>
      <ImportScreen />
    </Suspense>
  );
}

async function ImportScreen() {
  await requireUser();

  return (
    <div className="grid max-w-2xl gap-6">
      <header className="grid gap-3">
        <h1 className="font-display text-4xl tracking-tight">Import</h1>
        <p className="leading-7 text-muted">
          Bring your history from another app. You export a file there and upload it here.
          Titles you rated become Watched; titles on a watchlist go to your Watchlist.
          Anything already in Marquee is left as it is.
        </p>
      </header>

      <section className="grid gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Choose where from</h2>
        <ul className="grid gap-3">
          <li>
            <Link
              href="/import/imdb"
              className="flex items-center gap-4 rounded-2xl border border-line bg-card p-4 transition-colors hover:border-accent/60"
            >
              <span className="grid h-10 w-14 shrink-0 place-items-center rounded-lg bg-[#f5c518] text-sm font-black tracking-tight text-black">
                IMDb
              </span>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="font-semibold">IMDb</span>
                <span className="text-sm text-muted">Your ratings and your watchlist, as CSV files</span>
              </span>
              <ChevronLeftIcon className="size-5 shrink-0 rotate-180 text-muted" />
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
