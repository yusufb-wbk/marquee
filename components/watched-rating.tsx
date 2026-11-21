"use client";

import { useState } from "react";

import { RatingDialog, RatingTrigger } from "@/components/rating-dialog";
import { libraryNotice } from "@/lib/library/notices";
import { nextStarRating, ratingToDisplay, ratingToStored } from "@/lib/rating";

export function WatchedRating({
  csrf,
  kind,
  id,
  stored,
  onRated,
}: {
  csrf: string;
  kind: "movie" | "tv";
  id: number;
  stored: number | null;
  onRated: (rating: number | null) => void;
}) {
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
    body.set("kind", kind);
    body.set("tmdbId", String(id));
    body.set("rating", next === null ? "" : String(next));
    body.set("next", "/watched");
    const response = await fetch("/library/rating", {
      method: "POST",
      body,
      credentials: "same-origin",
      headers: { accept: "application/json" },
    }).catch(() => null);
    setPending(false);
    if (!response) {
      setNotice("That rating was not saved");
      return;
    }
    const payload: unknown = await response.json().catch(() => null);
    const result = readResult(payload);
    if (!result.ok) {
      setNotice(libraryNotice(result.error)?.title ?? "That rating was not saved");
      return;
    }
    const storedRating = next === null ? null : ratingToStored(next);
    if (next !== null && storedRating === null) {
      setNotice("That rating is not allowed");
      return;
    }
    setValue(next);
    setDraft(next);
    setOpen(false);
    onRated(storedRating);
  }

  return (
    <div>
      <RatingTrigger
        value={value}
        onOpen={() => {
          setDraft(value);
          setNotice(null);
          setOpen(true);
        }}
      />
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
        {draft !== null ? (
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
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            void save(draft);
          }}
          className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save rating"}
        </button>
      </RatingDialog>
    </div>
  );
}

function readResult(value: unknown): { ok: true } | { ok: false; error: string } {
  if (typeof value !== "object" || value === null) {
    return { ok: false, error: "save" };
  }
  const body = value as Record<string, unknown>;
  if (body.ok === true) {
    return { ok: true };
  }
  return { ok: false, error: typeof body.error === "string" ? body.error : "save" };
}
