"use client";

import { useState } from "react";

import type { WatchIntent } from "@/lib/progress";

const primary =
  "inline-flex h-12 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-60";
const quiet =
  "inline-flex h-12 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-60";

export function EpisodeActions({
  watched,
  pending,
}: {
  watched: boolean;
  pending: WatchIntent | null;
}) {
  const [open, setOpen] = useState(false);
  const busy = pending !== null;

  if (watched) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-notice">Watched</span>
        <button
          type="submit"
          name="intent"
          value="unwatch"
          disabled={busy}
          className={quiet}
        >
          {pending === "unwatch" ? "Saving…" : "Not watched"}
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        className={primary}
      >
        Watched
      </button>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <button
        type="submit"
        name="intent"
        value="watch"
        disabled={busy}
        className={primary}
      >
        {pending === "watch" ? "Saving…" : "Just this episode"}
      </button>
      <button
        type="submit"
        name="intent"
        value="upto"
        disabled={busy}
        className={quiet}
      >
        {pending === "upto" ? "Saving…" : "Watched up to here"}
      </button>
    </div>
  );
}
