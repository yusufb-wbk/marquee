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
