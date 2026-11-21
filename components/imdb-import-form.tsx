"use client";

import { useState, type FormEvent } from "react";

import { libraryNotice } from "@/lib/library/notices";
import { submitLibraryForm, submitterOf } from "@/lib/library/submit";

type Summary = {
  imported: number;
  skipped: number;
  unmatched: number;
  failed: number;
  remaining: number;
  idsStored: boolean;
  problem: string | null;
};

function readSummary(value: unknown): Summary | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const summary = value as Record<string, unknown>;
  if (
    typeof summary.imported !== "number" ||
    typeof summary.skipped !== "number" ||
    typeof summary.unmatched !== "number" ||
    typeof summary.failed !== "number" ||
    typeof summary.remaining !== "number" ||
    typeof summary.idsStored !== "boolean" ||
    (summary.problem !== null && typeof summary.problem !== "string")
  ) {
    return null;
  }
  return {
    imported: summary.imported,
    skipped: summary.skipped,
    unmatched: summary.unmatched,
    failed: summary.failed,
    remaining: summary.remaining,
    idsStored: summary.idsStored,
    problem: typeof summary.problem === "string" ? summary.problem : null,
  };
}

export function ImdbImportForm({ csrf }: { csrf: string }) {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    setPending(true);
    setNotice(null);
    const result = await submitLibraryForm(event.currentTarget, submitterOf(event));
    setPending(false);
    if (!result.ok) {
      setSummary(null);
      setNotice(libraryNotice(result.error)?.body ?? "That file was not imported.");
      return;
    }
    const next = readSummary(result.data);
    if (!next) {
      setNotice("That file was not imported.");
      return;
    }
    setSummary(next);
  }

  return (
    <form action="/library/import" method="post" className="grid gap-4" onSubmit={onSubmit}>
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="next" value="/import" />
      <label className="grid gap-2 text-sm font-medium" htmlFor="imdb-file">
        IMDb CSV
        <input
          id="imdb-file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="text-sm font-normal"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-60"
      >
        {pending ? "Importing…" : "Import"}
      </button>
      {notice ? (
        <p role="alert" className="text-sm text-notice">
          {notice}
        </p>
      ) : null}
      {summary?.problem ? (
        <p role="alert" className="text-sm text-notice">
          {summary.problem}
        </p>
      ) : null}
      {summary && !summary.problem ? (
        <div className="grid gap-2 text-sm" role="status">
          <p>Imported {summary.imported}.</p>
          <p className="text-muted">
            Skipped {summary.skipped}. No TMDB match for {summary.unmatched}. Failed{" "}
            {summary.failed}.
          </p>
          {summary.remaining > 0 ? (
            <p className="text-muted">
              {summary.remaining} titles are still in the file. Upload it again to continue.
            </p>
          ) : null}
          {!summary.idsStored ? (
            <p className="text-muted">
              Run supabase/schema.sql again so the next upload can skip titles already imported.
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
