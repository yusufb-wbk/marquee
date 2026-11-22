export function isoDateUTC(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function parseIsoDate(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }
  return value;
}

export function addCalendarDays(iso: string, days: number): string | null {
  const parsed = parseIsoDate(iso);
  if (!parsed || !Number.isInteger(days)) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(parsed);
  if (!match) {
    return null;
  }
  const utc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]) + days,
  );
  return new Date(utc).toISOString().slice(0, 10);
}

export function isOnOrBetween(
  value: string,
  start: string,
  end: string,
): boolean {
  return value >= start && value <= end;
}

export const CONFIRMED_YEAR_DAYS = 365;

/** A dated next episode that has already aired, or airs within the coming year. */
export function confirmedThisYear(airDate: string | null, today: string): boolean {
  if (!airDate) {
    return false;
  }
  const days = daysUntil(today, airDate);
  return days !== null && days <= CONFIRMED_YEAR_DAYS;
}

export function showsAiringThisYear<
  T extends { next: { state: string; episode?: { airDate: string | null } } },
>(items: readonly T[], today: string): T[] {
  return items.filter((item) => {
    if (item.next.state !== "ready") {
      return false;
    }
    return confirmedThisYear(item.next.episode?.airDate ?? null, today);
  });
}

/** Whole calendar days from `from` until `to`. Negative when `to` is earlier. */
export function daysUntil(from: string, to: string): number | null {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  if (!start || !end) {
    return null;
  }
  const span = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.round(span / 86_400_000);
}

export type AirHero =
  | { kind: "word"; value: string }
  | { kind: "count"; value: string; label: string };

/** The countdown that leads an up-next card. */
export function airHero(today: string, airDate: string | null): AirHero | null {
  if (!airDate) {
    return null;
  }
  const days = daysUntil(today, airDate);
  if (days === null) {
    return null;
  }
  if (days === 0) {
    return { kind: "word", value: "Today" };
  }
  if (days === 1) {
    return { kind: "count", value: "1", label: "day" };
  }
  if (days > 1) {
    return { kind: "count", value: String(days), label: "days" };
  }
  if (days === -1) {
    return { kind: "count", value: "1", label: "day ago" };
  }
  return { kind: "count", value: String(Math.abs(days)), label: "days ago" };
}

export function airCountdown(today: string, airDate: string | null): string | null {
  if (!airDate) {
    return null;
  }
  const days = daysUntil(today, airDate);
  if (days === null) {
    return null;
  }
  if (days === 0) {
    return "Today";
  }
  if (days === 1) {
    return "Tomorrow";
  }
  if (days > 1) {
    return `${days} days left`;
  }
  if (days === -1) {
    return "Yesterday";
  }
  return `${Math.abs(days)} days ago`;
}
