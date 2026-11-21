"use client";

import { useId, useState } from "react";

import { nextStarRating, ratingToDisplay } from "@/lib/rating";

const STAR =
  "M12 2.4 14.7 8.2 21 9.1 16.4 13.6 17.6 20 12 16.9 6.4 20 7.6 13.6 3 9.1 9.3 8.2 12 2.4Z";

export function RatingField({ stored }: { stored: number | null }) {
  const initial = stored === null ? null : ratingToDisplay(stored);
  const [value, setValue] = useState<number | null>(initial);
  const submitted = value === null ? "" : String(value);
  const label =
    value === null
      ? "No rating"
      : Number.isInteger(value)
        ? `${value}/10`
        : `${value.toFixed(1)}/10`;

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Rating</span>
        <span className="text-sm tabular-nums text-muted">{label}</span>
        {value !== null ? (
          <button
            type="button"
            onClick={() => {
              setValue(null);
            }}
            className="inline-flex h-11 items-center text-sm text-muted"
          >
            Clear
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-1" role="group" aria-label="Rating out of 10">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarButton
            key={star}
            star={star}
            value={value}
            onChoose={() => {
              setValue(nextStarRating(value, star));
            }}
          />
        ))}
      </div>
      <input type="hidden" name="rating" value={submitted} />
    </div>
  );
}

function StarButton({
  star,
  value,
  onChoose,
}: {
  star: number;
  value: number | null;
  onChoose: () => void;
}) {
  const half = star * 2 - 1;
  const full = star * 2;
  const points = (value ?? 0) - (star - 1) * 2;
  const fraction = Math.min(1, Math.max(0, points / 2));
  const pressed = value === half || value === full;

  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={
        value === half
          ? `${full} out of 10`
          : `${half} out of 10`
      }
      onClick={onChoose}
      className="inline-flex h-12 w-12 items-center justify-center"
    >
      <StarGlyph fraction={fraction} />
    </button>
  );
}

function StarGlyph({ fraction }: { fraction: number }) {
  const clipId = useId().replaceAll(":", "");

  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={fraction * 24} height="24" />
        </clipPath>
      </defs>
      <path d={STAR} className="fill-line" />
      <path d={STAR} clipPath={`url(#${clipId})`} className="fill-accent" />
    </svg>
  );
}
