"use client";

import { useState } from "react";

import { RatingDialog, RatingTrigger } from "@/components/rating-dialog";
import { nextStarRating, ratingToDisplay } from "@/lib/rating";

export function RatingField({
  stored,
  submit,
}: {
  stored: number | null;
  submit: {
    name: string;
    value: string;
    action: string;
    pending: boolean;
    persistRemove: boolean;
  } | null;
}) {
  const initial = stored === null ? null : ratingToDisplay(stored);
  const [value, setValue] = useState<number | null>(initial);
  const [open, setOpen] = useState(false);
  const submitted = value === null ? "" : String(value);

  return (
    <div className="flex justify-center">
      <input type="hidden" name="rating" value={submitted} />
      <RatingTrigger
        value={value}
        onOpen={() => {
          setOpen(true);
        }}
      />
      <RatingDialog
        open={open}
        value={value}
        pending={submit?.pending ?? false}
        notice={null}
        onClose={() => {
          setOpen(false);
        }}
        onChoose={(star) => {
          setValue(nextStarRating(value, star));
        }}
      >
        {submit?.persistRemove ? (
          <button
            type="submit"
            name={submit.name}
            value={submit.value}
            data-action={submit.action}
            disabled={submit.pending || value === null}
            onClick={(event) => {
              const input = event.currentTarget.form?.elements.namedItem("rating");
              if (input instanceof HTMLInputElement) {
                input.value = "";
              }
              setOpen(false);
            }}
            className={
              value === null
                ? "hidden"
                : "inline-flex h-11 items-center justify-center text-sm font-medium text-muted disabled:opacity-60"
            }
          >
            Remove rating
          </button>
        ) : value !== null ? (
          <button
            type="button"
            onClick={() => {
              setValue(null);
              setOpen(false);
            }}
            className="inline-flex h-11 items-center justify-center text-sm font-medium text-muted"
          >
            Remove rating
          </button>
        ) : null}
        {submit ? null : (
          <p className="text-sm text-muted">Saved when you choose Watchlist or Watched.</p>
        )}
        {submit ? (
          <button
            type="submit"
            name={submit.name}
            value={submit.value}
            data-action={submit.action}
            disabled={submit.pending}
            onClick={() => {
              setOpen(false);
            }}
            className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-60"
          >
            {submit.pending ? "Saving…" : "Save rating"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
            }}
            className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink"
          >
            Done
          </button>
        )}
      </RatingDialog>
    </div>
  );
}
