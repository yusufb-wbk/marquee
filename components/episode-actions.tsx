"use client";

import { useState } from "react";

const primary =
  "inline-flex h-12 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink";
const quiet =
  "inline-flex h-12 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold";

export function EpisodeActions({ watched }: { watched: boolean }) {
  const [open, setOpen] = useState(false);

  if (watched) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-notice">Watched</span>
        <button type="submit" name="intent" value="unwatch" className={quiet}>
          Not watched
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
      <button type="submit" name="intent" value="watch" className={primary}>
        Just this episode
      </button>
      <button type="submit" name="intent" value="upto" className={quiet}>
        Watched up to here
      </button>
    </div>
  );
}
