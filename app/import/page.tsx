import { Suspense } from "react";
import Link from "next/link";

import { readCsrfToken } from "@/components/csrf-field";
import { ImdbImportForm } from "@/components/imdb-import-form";
import { requireUser } from "@/lib/require-user";

export const metadata = {
  title: "Import from IMDb",
};

export default function ImportPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading import…</p>}>
      <ImportScreen />
    </Suspense>
  );
}

async function ImportScreen() {
  await requireUser();
  const csrf = await readCsrfToken();

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="font-display text-4xl tracking-tight">Import from IMDb</h1>
        <p className="leading-7 text-muted">
          IMDb does not let another app sign in to your account or read your
          ratings. Export a CSV, then upload it here.
        </p>
      </header>
      <ol className="grid list-decimal gap-2 pl-5 text-sm leading-6 text-muted">
        <li>Open IMDb and go to Your ratings or Your watchlist.</li>
        <li>Use Export and download the CSV.</li>
        <li>Upload that file below. Ratings become your Marquee score. Watchlist titles stay on your watchlist.</li>
      </ol>
      <ImdbImportForm csrf={csrf} />
      <Link href="/watched" className="text-sm text-muted">
        Back to what you have watched
      </Link>
    </div>
  );
}
