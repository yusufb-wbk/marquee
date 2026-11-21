/** Stored ratings are 1–20. The screen shows that number divided by 2, from 0.5 to 10. */

export function ratingToStored(display: number): number | null {
  if (!Number.isFinite(display)) {
    return null;
  }
  const doubled = Math.round(display * 2);
  if (Math.abs(display * 2 - doubled) > 1e-8) {
    return null;
  }
  if (doubled < 1 || doubled > 20) {
    return null;
  }
  return doubled;
}

export function ratingToDisplay(stored: number): number | null {
  if (!Number.isInteger(stored) || stored < 1 || stored > 20) {
    return null;
  }
  return stored / 2;
}

export function formatRating(stored: number | null): string | null {
  const display = stored === null ? null : ratingToDisplay(stored);
  if (display === null) {
    return null;
  }
  return Number.isInteger(display) ? display.toFixed(0) : display.toFixed(1);
}

export function parseRatingField(
  value: FormDataEntryValue | null,
): { ok: true; rating: number | null } | { ok: false } {
  if (value === null || value === "") {
    return { ok: true, rating: null };
  }
  if (typeof value !== "string" || !/^\d+(?:\.5)?$/.test(value)) {
    return { ok: false };
  }
  const rating = ratingToStored(Number(value));
  if (rating === null) {
    return { ok: false };
  }
  return { ok: true, rating };
}

export function parseNoteField(
  value: FormDataEntryValue | null,
): { ok: true; note: string | null } | { ok: false } {
  if (typeof value !== "string") {
    return { ok: true, note: null };
  }
  const note = value.trim();
  if (note.length > 500) {
    return { ok: false };
  }
  return { ok: true, note: note.length > 0 ? note : null };
}

/** Ten stars. One click sets the half (0.5), the next click fills that star. */
export function nextStarRating(current: number | null, star: number): number {
  const half = star - 0.5;
  const full = star;
  if (current === half) {
    return full;
  }
  if (current === full) {
    return half;
  }
  return half;
}

export const RATING_STEPS = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5,
  10,
] as const;
