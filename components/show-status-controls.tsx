"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  BookmarkIcon,
  CheckIcon,
  CloseIcon,
  EyeIcon,
  PauseIcon,
} from "@/components/icons";
import { RatingField } from "@/components/rating-field";
import type { ShowStatus } from "@/lib/library/database";
import { libraryNotice } from "@/lib/library/notices";
import { submitLibraryForm, submitterOf } from "@/lib/library/submit";
import { subscribeShowStatus } from "@/lib/show-status-bus";

const OPTIONS: {
  status: ShowStatus;
  label: string;
  Icon: typeof EyeIcon;
}[] = [
  { status: "watching", label: "Watching", Icon: EyeIcon },
  { status: "watchlist", label: "Watchlist", Icon: BookmarkIcon },
  { status: "stopped", label: "Stopped", Icon: PauseIcon },
];

export function ShowStatusControls({
  csrf,
  showId,
  current,
  rating,
  nextPath,
}: {
  csrf: string;
  showId: number;
  current: ShowStatus | null;
  rating: number | null;
  nextPath: string;
}) {
  const [status, setStatus] = useState(current);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => subscribeShowStatus(setStatus), []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    const submitter = submitterOf(event);
    const value = submitter?.value ?? "";
    setPending(submitter?.dataset.action ?? value);
    setSaved(false);
    setNotice(null);
    const result = await submitLibraryForm(event.currentTarget, submitter);
    setPending(null);
    if (!result.ok) {
      setNotice(libraryNotice(result.error)?.title ?? "That change was not saved");
      return;
    }
    if (value === "remove") {
      setStatus(null);
    } else if (value === "watching" || value === "watchlist" || value === "stopped") {
      setStatus(value);
    }
    setSaved(true);
  }

  return (
    <form action="/library/show" method="post" className="grid gap-3" onSubmit={onSubmit}>
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="tmdbId" value={showId} />
      <input type="hidden" name="next" value={nextPath} />
      <RatingField stored={rating} />
      <div className="flex justify-end">
        <button
          type="submit"
          name="status"
          value={status ?? "watching"}
          data-action="rating"
          disabled={pending !== null}
          className="inline-flex h-11 items-center justify-center rounded-full border border-line px-4 text-sm font-semibold disabled:opacity-60"
        >
          {pending === "rating" ? "Saving…" : "Save rating"}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => {
          const selected = status === option.status;
          return (
            <button
              key={option.status}
              type="submit"
              name="status"
              value={option.status}
              aria-pressed={selected}
              disabled={pending !== null}
              className={
                selected
                  ? "grid min-h-16 content-center justify-items-center gap-1 rounded-2xl bg-accent px-2 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
                  : "grid min-h-16 content-center justify-items-center gap-1 rounded-2xl border border-line px-2 py-2 text-xs font-semibold disabled:opacity-60"
              }
            >
              {selected ? <CheckIcon className="h-5 w-5" /> : <option.Icon className="h-5 w-5" />}
              {pending === option.status ? "Saving…" : option.label}
            </button>
          );
        })}
      </div>
      {status ? (
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
