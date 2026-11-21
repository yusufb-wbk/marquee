"use client";

import { useState, type FormEvent } from "react";

import { BookmarkIcon, CheckIcon, CloseIcon } from "@/components/icons";
import { RatingField } from "@/components/rating-field";
import type { MovieStatus } from "@/lib/library/database";
import { libraryNotice } from "@/lib/library/notices";
import { submitLibraryForm, submitterOf } from "@/lib/library/submit";
import { parseRatingField } from "@/lib/rating";

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
  const [committedRating, setCommittedRating] = useState(rating);
  const [ratingVersion, setRatingVersion] = useState(0);
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
    const ratingField = new FormData(event.currentTarget).get("rating");
    setPending(value);
    setSaved(false);
    setNotice(null);
    const result = await submitLibraryForm(event.currentTarget, submitter);
    setPending(null);
    if (!result.ok) {
      setNotice(libraryNotice(result.error)?.title ?? "That change was not saved");
      setRatingVersion((version) => version + 1);
      return;
    }
    const parsed = parseRatingField(ratingField);
    if (parsed.ok) {
      setCommittedRating(parsed.rating);
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
      <RatingField
        key={`${ratingVersion}:${committedRating ?? "none"}`}
        stored={committedRating}
        submit={
          current
            ? {
                name: "status",
                value: current,
                action: current,
                pending: pending !== null,
                persistRemove: true,
              }
            : null
        }
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="submit"
          name="status"
          value="watchlist"
          aria-pressed={current === "watchlist"}
          disabled={pending !== null}
          className={
            current === "watchlist"
              ? "grid min-h-16 content-center justify-items-center gap-1 rounded-2xl bg-accent px-2 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
              : "grid min-h-16 content-center justify-items-center gap-1 rounded-2xl border border-line px-2 py-2 text-xs font-semibold disabled:opacity-60"
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
              ? "grid min-h-16 content-center justify-items-center gap-1 rounded-2xl bg-accent px-2 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
              : "grid min-h-16 content-center justify-items-center gap-1 rounded-2xl border border-line px-2 py-2 text-xs font-semibold disabled:opacity-60"
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
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium text-muted disabled:opacity-60"
        >
          <CloseIcon className="h-4 w-4" />
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
