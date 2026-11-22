"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { StarIcon } from "@/components/icons";
import { RatingDialog } from "@/components/rating-dialog";
import { libraryNotice } from "@/lib/library/notices";
import { nextStarRating, ratingToDisplay } from "@/lib/rating";

/**
 * Your own score, as the first chip in the ratings row. Rating a title you do not
 * track adds it: a movie as Watched, a show as Watching, since you have seen it.
 */
export function YourRatingChip({
  csrf,
  kind,
  id,
  stored,
  tracked,
}: {
  csrf: string;
  kind: "movie" | "tv";
  id: number;
  /** Stored rating, 1–20 (shown halved). */
  stored: number | null;
  tracked: boolean;
}) {
  const router = useRouter();
  const initial = stored === null ? null : ratingToDisplay(stored);
  const [value, setValue] = useState<number | null>(initial);
  const [draft, setDraft] = useState<number | null>(initial);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function save(next: number | null) {
    setPending(true);
    setNotice(null);
    const body = new FormData();
    body.set("csrf", csrf);
    body.set("tmdbId", String(id));
    body.set("rating", next === null ? "" : String(next));
    let route = "/library/rating";
    if (tracked) {
      body.set("kind", kind);
    } else {
      route = kind === "movie" ? "/library/movie" : "/library/show";
      body.set("status", kind === "movie" ? "watched" : "watching");
    }
    const response = await fetch(route, {
      method: "POST",
      body,
      credentials: "same-origin",
      headers: { accept: "application/json" },
    }).catch(() => null);
    const payload: unknown = response ? await response.json().catch(() => null) : null;
    setPending(false);
    const result = payload as { ok?: boolean; error?: string } | null;
    if (!result?.ok) {
      setNotice(libraryNotice(result?.error ?? "save")?.title ?? "That rating was not saved");
      return;
    }
    setValue(next);
    setOpen(false);
    if (!tracked) {
      // The title is now in your library; refresh so the status card shows it.
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setNotice(null);
          setOpen(true);
        }}
        className={`grid h-full min-w-28 gap-1.5 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
          value === null ? "border-dashed border-line hover:border-accent/60" : "border-accent/60 bg-card"
        }`}
      >
        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">Your rating</span>
        <span className="flex items-baseline gap-1">
          <StarIcon className={`h-4 w-4 self-center ${value === null ? "text-muted" : "text-accent"}`} />
          <span className="font-display text-2xl leading-none tabular-nums">
            {value === null ? "Rate" : Number.isInteger(value) ? value : value.toFixed(1)}
          </span>
          {value === null ? null : <span className="text-xs text-muted">/10</span>}
        </span>
      </button>
      <RatingDialog
        open={open}
        value={draft}
        pending={pending}
        notice={notice}
        onClose={() => {
          if (!pending) {
            setOpen(false);
          }
        }}
        onChoose={(star) => {
          setDraft(nextStarRating(draft, star));
        }}
      >
        {value !== null ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              void save(null);
            }}
            className="inline-flex h-11 items-center justify-center text-sm font-medium text-muted disabled:opacity-60"
          >
            Remove rating
          </button>
        ) : null}
        {!tracked ? (
          <p className="text-sm text-muted">
            Saving adds it to your list as {kind === "movie" ? "Watched" : "Watching"}.
          </p>
        ) : null}
        <button
          type="button"
          disabled={pending || draft === null}
          onClick={() => {
            void save(draft);
          }}
          className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save rating"}
        </button>
      </RatingDialog>
    </>
  );
}
