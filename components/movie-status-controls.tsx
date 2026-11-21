"use client";

import { useState, type FormEvent } from "react";

import { BookmarkIcon, CheckIcon, CloseIcon } from "@/components/icons";
import { RatingField } from "@/components/rating-field";
import type { MovieStatus } from "@/lib/library/database";
import { libraryNotice } from "@/lib/library/notices";
import { submitLibraryForm, submitterOf } from "@/lib/library/submit";

export function MovieStatusControls({
  csrf,
  movieId,
  status,
  watchedOn,
  rating,
  today,
  nextPath,
}: {
  csrf: string;
  movieId: number;
  status: MovieStatus | null;
  watchedOn: string | null;
  rating: number | null;
  today: string;
  nextPath: string;
}) {
  const [current, setCurrent] = useState(status);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    const submitter = submitterOf(event);
    const value = submitter?.value ?? "";
    setPending(value);
    setSaved(false);
    setNotice(null);
    const result = await submitLibraryForm(event.currentTarget, submitter);
    setPending(null);
    if (!result.ok) {
      setNotice(libraryNotice(result.error)?.title ?? "That change was not saved");
      return;
    }
    if (value === "remove") {
      setCurrent(null);
    } else if (value === "watchlist" || value === "watched") {
      setCurrent(value);
    }
    setSaved(true);
  }

  return (
    <form action="/library/movie" method="post" className="grid gap-4" onSubmit={onSubmit}>
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="tmdbId" value={movieId} />
      <input type="hidden" name="next" value={nextPath} />
      <label className="grid gap-2 text-sm font-medium">
        Watched on
        <input
          type="date"
          name="watchedOn"
          defaultValue={watchedOn ?? today}
          className="h-12 rounded-xl border border-line bg-background px-4 text-base font-normal text-foreground"
        />
      </label>
      <RatingField stored={rating} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          name="status"
          value="watchlist"
          aria-pressed={current === "watchlist"}
          disabled={pending !== null}
          className={
            current === "watchlist"
              ? "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-60"
              : "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-60"
          }
        >
          {current === "watchlist" ? (
            <CheckIcon className="h-5 w-5" />
          ) : (
            <BookmarkIcon className="h-5 w-5" />
          )}
          {pending === "watchlist" ? "Saving…" : "Watchlist"}
        </button>
        <button
          type="submit"
          name="status"
          value="watched"
          aria-pressed={current === "watched"}
          disabled={pending !== null}
          className={
            current === "watched"
              ? "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-60"
              : "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-60"
          }
        >
          <CheckIcon className="h-5 w-5" />
          {pending === "watched" ? "Saving…" : "Watched"}
        </button>
      </div>
      {current ? (
        <button
          type="submit"
          name="status"
          value="remove"
          disabled={pending !== null}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-60"
        >
          <CloseIcon className="h-5 w-5" />
          {pending === "remove" ? "Saving…" : "Remove from my list"}
        </button>
      ) : null}
      {notice ? (
        <p role="alert" className="text-sm text-notice">
          {notice}
        </p>
      ) : null}
      {saved && !notice ? (
        <p role="status" className="text-sm text-muted">
          Saved
        </p>
      ) : null}
    </form>
  );
}
