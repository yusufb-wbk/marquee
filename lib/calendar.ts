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
