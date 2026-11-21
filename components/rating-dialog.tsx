"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { CloseIcon } from "@/components/icons";

const STAR =
  "M12 2.4 14.7 8.2 21 9.1 16.4 13.6 17.6 20 12 16.9 6.4 20 7.6 13.6 3 9.1 9.3 8.2 12 2.4Z";

export function ratingLabel(value: number | null): string {
  if (value === null) {
    return "Not rated";
  }
  return `${Number.isInteger(value) ? String(value) : value.toFixed(1)}/10`;
}

export function RatingTrigger({
  value,
  onOpen,
}: {
  value: number | null;
  onOpen: () => void;
}) {
  const label = ratingLabel(value);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-3 text-sm font-semibold"
    >
      <StarGlyph fraction={value === null ? 0 : 1} className="h-4 w-4" />
      <span className="tabular-nums">{label}</span>
    </button>
  );
}

export function RatingDialog({
  open,
  value,
  pending,
  notice,
  onClose,
  onChoose,
  children,
}: {
  open: boolean;
  value: number | null;
  pending: boolean;
  notice: string | null;
  onClose: () => void;
  onChoose: (star: number) => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="w-[min(100%-2rem,26rem)] rounded-3xl border border-line bg-card p-5 text-foreground"
    >
      <div className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="font-display text-2xl">
            Your rating
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="font-display text-4xl tabular-nums text-accent">{ratingLabel(value)}</p>
        <div className="grid grid-cols-10 gap-1" role="group" aria-label="Rating out of 10">
          {Array.from({ length: 10 }, (_, index) => index + 1).map((star) => (
            <StarButton
              key={star}
              star={star}
              value={value}
              disabled={pending}
              onChoose={() => {
                onChoose(star);
              }}
            />
          ))}
        </div>
        <p className="text-sm text-muted">Tap once for a half star, again to fill it.</p>
        {notice ? (
          <p role="alert" className="text-sm text-notice">
            {notice}
          </p>
        ) : null}
        <div className="grid gap-2">{children}</div>
      </div>
    </dialog>
  );
}

function StarButton({
  star,
  value,
  disabled,
  onChoose,
}: {
  star: number;
  value: number | null;
  disabled: boolean;
  onChoose: () => void;
}) {
  const half = star - 0.5;
  const full = star;
  const points = (value ?? 0) - (star - 1);
  const fraction = Math.min(1, Math.max(0, points));
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={value === half || value === full}
      aria-label={value === half ? `${full} out of 10` : `${half} out of 10`}
      onClick={onChoose}
      className="inline-flex h-11 w-full items-center justify-center disabled:opacity-60"
    >
      <StarGlyph fraction={fraction} className="h-6 w-6" />
    </button>
  );
}

function StarGlyph({ fraction, className }: { fraction: number; className: string }) {
  const clipId = useId().replaceAll(":", "");
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
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
