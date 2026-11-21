export type ImdbCsvRow = {
  imdbId: string;
  title: string;
  titleType: string;
  rating: number | null;
  date: string | null;
};

const ROW_CAP = 2000;

export function parseImdbCsv(
  text: string,
): { ok: true; rows: ImdbCsvRow[] } | { ok: false; error: string } {
  const table = parseCsv(text.replace(/^\uFEFF/, ""));
  const header = table[0];
  if (!header) {
    return { ok: false, error: "That file has no header row." };
  }
  const columns = header.map((cell) => cell.trim().toLowerCase());
  const idAt = columns.indexOf("const");
  const titleAt = columns.indexOf("title");
  if (idAt < 0 || titleAt < 0) {
    return {
      ok: false,
      error: "Use an IMDb ratings or watchlist CSV. It needs Const and Title columns.",
    };
  }
  const typeAt = columns.indexOf("title type");
  const ratingAt = columns.indexOf("your rating");
  const dateAt = ["date rated", "created", "modified"]
    .map((name) => columns.indexOf(name))
    .find((index) => index >= 0) ?? -1;

  const byId = new Map<string, ImdbCsvRow>();
  for (const cells of table.slice(1, ROW_CAP + 1)) {
    const imdbId = cells[idAt]?.trim().toLowerCase() ?? "";
    if (!/^tt\d{7,10}$/.test(imdbId)) {
      continue;
    }
    const title = (cells[titleAt] ?? "").trim().slice(0, 300);
    if (title.length === 0) {
      continue;
    }
    const row: ImdbCsvRow = {
      imdbId,
      title,
      titleType: typeAt >= 0 ? (cells[typeAt] ?? "").trim() : "",
      rating: ratingAt >= 0 ? readRating(cells[ratingAt] ?? "") : null,
      date: dateAt >= 0 ? readDate(cells[dateAt] ?? "") : null,
    };
    const previous = byId.get(imdbId);
    if (!previous || (previous.rating === null && row.rating !== null)) {
      byId.set(imdbId, row);
    }
  }

  if (byId.size === 0) {
    return { ok: false, error: "No IMDb titles were found in that file." };
  }
  return { ok: true, rows: [...byId.values()] };
}

function readRating(value: string): number | null {
  const text = value.trim();
  if (!/^\d{1,2}$/.test(text)) {
    return null;
  }
  const rating = Number(text);
  if (rating < 1 || rating > 10) {
    return null;
  }
  return rating;
}

function readDate(value: string): string | null {
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  if (iso?.[1]) {
    return iso[1];
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString().slice(0, 10);
}

function parseCsv(text: string): string[][] {
  const source = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.trim().length > 0)) {
      rows.push(row);
    }
  }
  return rows;
}
