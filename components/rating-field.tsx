"use client";

import { useState } from "react";

import { RATING_STEPS, ratingToDisplay } from "@/lib/rating";

export function RatingField({ stored }: { stored: number | null }) {
  const initial = stored === null ? null : ratingToDisplay(stored);
  const [enabled, setEnabled] = useState(initial !== null);
  const [value, setValue] = useState(initial ?? 8);

  return (
    <div className="grid gap-2">
      <label className="flex items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          className="size-5 accent-accent"
          checked={enabled}
          onChange={(event) => {
            setEnabled(event.target.checked);
          }}
        />
        Rating
      </label>
      {enabled ? (
        <div className="grid gap-3">
          <p className="font-display text-3xl tabular-nums">{value.toFixed(1)}</p>
          <input
            type="range"
            name="rating"
            min={1}
            max={10}
            step={0.5}
            value={value}
            aria-valuetext={value.toFixed(1)}
            onChange={(event) => {
              setValue(Number(event.target.value));
            }}
            className="h-12 w-full accent-accent"
          />
          <div className="flex flex-wrap gap-2">
            {RATING_STEPS.map((step) => {
              const label = Number.isInteger(step) ? step.toFixed(0) : step.toFixed(1);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={value === step}
                  onClick={() => {
                    setValue(step);
                  }}
                  className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-line px-2 text-sm font-medium"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <input type="hidden" name="rating" value="" />
      )}
    </div>
  );
}
