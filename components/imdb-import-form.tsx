"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { libraryNotice } from "@/lib/library/notices";
import { submitLibraryForm, submitterOf } from "@/lib/library/submit";

type Item = { imdbId: string; title: string; reason?: string };

type Summary = {
  imported: number;
  completed: number;
  totalRows: number;
  skipped: number;
  unmatched: number;
  failed: number;
  remaining: number;
  paused: boolean;
  nextCursor: number | null;
  problem: string | null;
  skippedItems: Item[];
  unmatchedItems: Item[];
  failedItems: Item[];
};

type Progress = {
  total: number;
  alreadyHad: number;
  imported: number;
  completed: number;
  unmatched: number;
  failed: number;
  remaining: number;
  done: boolean;
  alreadyHadItems: Item[];
  unmatchedItems: Item[];
  failedItems: Item[];
};

const PAUSE_MS = 30_000;
const MAX_PAUSES_IN_A_ROW = 6;

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
    (summary.problem !== null && typeof summary.problem !== "string")
  ) {
    return null;
  }
  return {
    imported: summary.imported,
    completed: typeof summary.completed === "number" ? summary.completed : 0,
    totalRows: typeof summary.totalRows === "number" ? summary.totalRows : 0,
    skipped: summary.skipped,
    unmatched: summary.unmatched,
    failed: summary.failed,
    remaining: summary.remaining,
    paused: summary.paused === true,
    nextCursor: typeof summary.nextCursor === "number" ? summary.nextCursor : null,
    problem: typeof summary.problem === "string" ? summary.problem : null,
    skippedItems: readItems(summary.skippedItems),
    unmatchedItems: readItems(summary.unmatchedItems),
    failedItems: readItems(summary.failedItems),
  };
}

function readItems(value: unknown): Item[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) {
      return [];
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.imdbId !== "string" || typeof record.title !== "string") {
      return [];
    }
    return [
      typeof record.reason === "string"
        ? { imdbId: record.imdbId, title: record.title, reason: record.reason }
        : { imdbId: record.imdbId, title: record.title },
    ];
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ImdbImportForm({ csrf }: { csrf: string }) {
  const [pending, setPending] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const cursorRef = useRef<HTMLInputElement>(null);

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setNotice(null);
    setProgress(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    const form = event.currentTarget;
    const submitter = submitterOf(event);
    setPending(true);
    setNotice(null);
    setProgress(null);

    // The server looks up 50 titles per upload. Upload the same file again from
    // where it stopped until every title is in.
    let cursor = 0;
    let pauses = 0;
    let totals = null as Progress | null;
    for (;;) {
      if (cursorRef.current) {
        cursorRef.current.value = String(cursor);
      }
      const result = await submitLibraryForm(form, submitter);
      if (!result.ok) {
        setNotice(
          totals
            ? "The import stopped part way. Tap Import again to pick up where it left off."
            : (libraryNotice(result.error)?.body ?? "That file was not imported."),
        );
        break;
      }
      const pass = readSummary(result.data);
      if (!pass) {
        setNotice("That file was not imported.");
        break;
      }
      if (pass.problem) {
        setNotice(pass.problem);
        break;
      }

      const previous: Progress | null = totals;
      totals = previous
        ? {
            ...previous,
            imported: previous.imported + pass.imported,
            completed: previous.completed + pass.completed,
            unmatched: previous.unmatched + pass.unmatched,
            failed: previous.failed + pass.failed,
            remaining: pass.remaining,
            unmatchedItems: [...previous.unmatchedItems, ...pass.unmatchedItems],
            failedItems: [...previous.failedItems, ...pass.failedItems],
          }
        : {
            total:
              pass.totalRows ||
              pass.skipped + pass.imported + pass.unmatched + pass.failed + pass.remaining,
            alreadyHad: pass.skipped,
            imported: pass.imported,
            completed: pass.completed,
            unmatched: pass.unmatched,
            failed: pass.failed,
            remaining: pass.remaining,
            done: false,
            // Later passes also skip titles saved by earlier passes, so only the first pass says what you already had.
            alreadyHadItems: pass.skippedItems,
            unmatchedItems: pass.unmatchedItems,
            failedItems: pass.failedItems,
          };
      if (pass.nextCursor === null) {
        totals = { ...totals, remaining: 0, done: true };
        setProgress(totals);
        break;
      }
      setProgress(totals);

      if (pass.paused) {
        pauses += 1;
        if (pauses > MAX_PAUSES_IN_A_ROW) {
          setNotice("TMDB is busy. Tap Import again in a few minutes to finish.");
          break;
        }
        setWaiting(true);
        await wait(PAUSE_MS);
        setWaiting(false);
      } else {
        pauses = 0;
      }
      cursor = pass.nextCursor;
    }
    setPending(false);
    setWaiting(false);
  }

  const handled = progress ? progress.total - progress.remaining : 0;
  const percent = progress && progress.total > 0 ? Math.round((handled / progress.total) * 100) : 0;

  return (
    <form
      action="/library/import"
      method="post"
      encType="multipart/form-data"
      className="grid gap-4"
      onSubmit={onSubmit}
    >
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="next" value="/import" />
      <input ref={cursorRef} type="hidden" name="cursor" defaultValue="0" />
      <label
        htmlFor="imdb-file"
        className={`grid cursor-pointer place-items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors has-[:focus-visible]:border-accent ${
          file ? "border-accent bg-card" : "border-line bg-card hover:border-muted"
        }`}
      >
        <input
          id="imdb-file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          onChange={onPick}
          className="sr-only"
        />
        <FileIcon />
        {file ? (
          <>
            <span className="max-w-full truncate font-medium">{file.name}</span>
            <span className="text-sm text-muted">
              {formatSize(file.size)} · <span className="text-accent">Choose another</span>
            </span>
          </>
        ) : (
          <>
            <span className="font-medium">Choose your IMDb CSV</span>
            <span className="text-sm text-muted">Tap to pick the file you exported</span>
          </>
        )}
      </label>
      <button
        type="submit"
        disabled={pending || !file}
        className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-4 text-base font-semibold text-accent-ink disabled:opacity-40"
      >
        {pending ? "Importing…" : "Import"}
      </button>
      {progress && !progress.done ? (
        <div role="status" className="grid gap-2 rounded-2xl border border-line bg-card px-4 py-3 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium">
              {waiting ? "Pausing so TMDB is not overloaded…" : "Importing…"}
            </span>
            <span className="tabular-nums text-muted">
              {handled} of {progress.total}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-line" aria-hidden="true">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${Math.max(2, percent)}%` }}
            />
          </div>
          <p className="text-muted">Keep this page open until it finishes.</p>
        </div>
      ) : null}
      {notice ? (
        <p role="alert" className="rounded-2xl bg-danger-bg px-4 py-3 text-sm text-danger">
          {notice}
        </p>
      ) : null}
      {progress?.done ? (
        <div role="status" className="grid gap-1 rounded-2xl bg-notice-bg px-4 py-3 text-sm text-notice">
          <p className="font-semibold">
            {progress.imported === 1 ? "Imported 1 title." : `Imported ${progress.imported} titles.`}
          </p>
          {progress.completed > 0 ? (
            <p>
              Marked every aired episode watched for{" "}
              {progress.completed === 1 ? "1 rated show" : `${progress.completed} rated shows`}.
            </p>
          ) : null}
          {details(progress) ? <p>{details(progress)}</p> : null}
        </div>
      ) : null}
      {progress && !pending ? (
        <div className="grid gap-2">
          <ItemGroup label="Failed" items={progress.failedItems} />
          <ItemGroup label="Not found on TMDB" items={progress.unmatchedItems} />
          <ItemGroup label="Already in your list" items={progress.alreadyHadItems} />
        </div>
      ) : null}
    </form>
  );
}

function details(progress: Progress): string {
  return [
    progress.alreadyHad > 0 ? `${progress.alreadyHad} already in your list` : null,
    progress.unmatched > 0 ? `${progress.unmatched} not found on TMDB` : null,
    progress.failed > 0 ? `${progress.failed} failed` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FileIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M12 17v-6" />
      <path d="m9.5 13.5 2.5-2.5 2.5 2.5" />
    </svg>
  );
}

function ItemGroup({ label, items }: { label: string; items: Item[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <details className="group rounded-2xl border border-line bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="font-medium">{label}</span>
        <span className="flex items-center gap-2 text-sm tabular-nums text-muted">
          {items.length}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform group-open:rotate-180"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </summary>
      <ul className="grid border-t border-line">
        {items.map((entry, index) => (
          <li
            key={`${entry.imdbId}-${index}`}
            className="grid gap-0.5 border-b border-line px-4 py-2.5 last:border-b-0"
          >
            <a
              href={`https://www.imdb.com/title/${entry.imdbId}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:text-accent"
            >
              {entry.title}
              <span className="ml-1.5 text-xs font-normal text-muted">{entry.imdbId}</span>
            </a>
            {entry.reason ? <span className="text-xs text-muted">{entry.reason}</span> : null}
          </li>
        ))}
      </ul>
    </details>
  );
}
