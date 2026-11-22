"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  BookmarkIcon,
  CloseIcon,
  EyeIcon,
  PauseIcon,
} from "@/components/icons";
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
  { status: "stopped", label: "Stop", Icon: PauseIcon },
];

export function ShowStatusControls({
  csrf,
  showId,
  current,
  nextPath,
  finished,
}: {
  csrf: string;
  showId: number;
  current: ShowStatus | null;
  nextPath: string;
  finished: boolean;
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
    <form
      action="/library/show"
      method="post"
      // A container: the card lays itself out by its own width, so it works full width
      // on tablets and in the narrow side column on wide screens.
      className="@container grid w-full gap-3 rounded-3xl border border-line bg-card p-4 sm:p-5"
      onSubmit={onSubmit}
    >
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="tmdbId" value={showId} />
      <input type="hidden" name="next" value={nextPath} />
      <div className="grid gap-3 @2xl:grid-cols-[auto_minmax(0,1fr)] @2xl:items-center @2xl:gap-5">
        <div className={finished ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-2"}>
          {OPTIONS.filter((option) => !finished || option.status !== "stopped").map((option) => {
            const selected =
              option.status === "watching"
                ? status === "watching" || (finished && status === "stopped")
                : status === option.status;
            // "Stop" is an action until the show is stopped; then it names the state.
            const label =
              finished && option.status === "watching"
                ? "Watched"
                : option.status === "stopped" && selected
                  ? "Stopped"
                  : option.label;
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
                {/* Each state keeps its own icon; the filled button shows which one is current. */}
                <option.Icon className="h-5 w-5" />
                {pending === option.status ? "Saving…" : label}
              </button>
            );
          })}
        </div>
      </div>
      {status ? (
        <button
          type="submit"
          name="status"
          value="remove"
          disabled={pending !== null}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium text-muted disabled:opacity-60 @2xl:justify-self-end @2xl:px-3"
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
