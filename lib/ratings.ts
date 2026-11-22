/** Scores from other sites (IMDb, Rotten Tomatoes, Metacritic…) for one title. Pure parsing. */

export type ExternalRating = {
  source: RatingSource;
  /** What to show, such as "8.1", "94%" or "78". */
  display: string;
  /** Out of 100, for comparing and colouring. */
  score: number;
  votes: number | null;
  url: string | null;
};

export type RatingSource =
  | "imdb"
  | "tomatoes"
  | "audience"
  | "metacritic"
  | "letterboxd"
  | "trakt"
  | "tmdb";

export const RATING_LABELS: Record<RatingSource, string> = {
  imdb: "IMDb",
  tomatoes: "RT Critics",
  audience: "RT Audience",
  metacritic: "Metacritic",
  letterboxd: "Letterboxd",
  trakt: "Trakt",
  tmdb: "TMDB",
};

const ORDER: RatingSource[] = ["imdb", "tomatoes", "audience", "metacritic", "letterboxd", "trakt", "tmdb"];

/** MDBList's names for each source, including older spellings. */
const SOURCE_NAMES: Record<string, RatingSource> = {
  imdb: "imdb",
  tomatoes: "tomatoes",
  rottentomatoes: "tomatoes",
  popcorn: "audience",
  tomatoesaudience: "audience",
  metacritic: "metacritic",
  letterboxd: "letterboxd",
  letterbox: "letterboxd",
  trakt: "trakt",
  tmdb: "tmdb",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function number(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

/** How each site writes its score: IMDb 8.1/10, Rotten Tomatoes 94%, Letterboxd 4.1/5. */
function format(source: RatingSource, value: number, score: number): string {
  switch (source) {
    case "imdb":
    case "tmdb":
      return (value > 10 ? score / 10 : value).toFixed(1);
    case "letterboxd":
      return (value > 5 ? score / 20 : value).toFixed(1);
    case "tomatoes":
    case "audience":
    case "trakt":
      return `${Math.round(score)}%`;
    case "metacritic":
      return String(Math.round(score));
  }
}

export type MdblistResult = {
  /** MDBList's combined score, 0–100, across all the sites below. */
  score: number | null;
  ratings: ExternalRating[];
};

/** A word for a 0–100 score, for the combined-score chip. */
export function scoreWord(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very good";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 45) return "Mixed";
  return "Poor";
}

/** MDBList gives site paths ("/m/fight_club") or ids, not full links. */
function sourceUrl(
  source: RatingSource,
  kind: "movie" | "tv",
  path: unknown,
  ids: Record<string, unknown>,
): string | null {
  const relative = typeof path === "string" && /^\/?[\w\-./%]+$/.test(path) ? path.replace(/^\/?/, "/") : null;
  switch (source) {
    case "imdb":
      return typeof ids.imdb === "string" && /^tt\d+$/.test(ids.imdb) ? `https://www.imdb.com/title/${ids.imdb}/` : null;
    case "tomatoes":
    case "audience":
      return relative ? `https://www.rottentomatoes.com${relative}` : null;
    case "metacritic":
      return relative ? `https://www.metacritic.com/${kind === "tv" ? "tv" : "movie"}${relative}` : null;
    case "letterboxd":
      return relative ? `https://letterboxd.com${relative}` : null;
    case "trakt":
      return typeof ids.trakt === "number" ? `https://trakt.tv/${kind === "tv" ? "shows" : "movies"}/${ids.trakt}` : null;
    case "tmdb":
      return typeof ids.tmdb === "number" ? `https://www.themoviedb.org/${kind}/${ids.tmdb}` : null;
  }
}

/** Reads MDBList's title response. Missing or empty scores are left out. */
export function parseMdblist(body: unknown, kind: "movie" | "tv"): MdblistResult {
  const combined = isRecord(body) ? number(body.score) : null;
  return {
    score: combined !== null && combined > 0 ? Math.min(100, combined) : null,
    ratings: parseMdblistRatings(body, kind),
  };
}

function parseMdblistRatings(body: unknown, kind: "movie" | "tv"): ExternalRating[] {
  if (!isRecord(body) || !Array.isArray(body.ratings)) {
    return [];
  }
  const ids = isRecord(body.ids) ? body.ids : {};
  const ratings = new Map<RatingSource, ExternalRating>();
  for (const item of body.ratings) {
    if (!isRecord(item) || typeof item.source !== "string") {
      continue;
    }
    const source = SOURCE_NAMES[item.source.toLowerCase().replace(/[^a-z]/g, "")];
    const value = number(item.value);
    const score = number(item.score) ?? (value !== null ? scoreFrom(source, value) : null);
    if (!source || score === null || score <= 0 || ratings.has(source)) {
      continue;
    }
    ratings.set(source, {
      source,
      display: format(source, value ?? score, score),
      score: Math.max(0, Math.min(100, score)),
      votes: number(item.votes),
      url: sourceUrl(source, kind, item.url, ids),
    });
  }
  return ORDER.flatMap((source) => {
    const rating = ratings.get(source);
    return rating ? [rating] : [];
  });
}

function scoreFrom(source: RatingSource | undefined, value: number): number | null {
  if (!source) {
    return null;
  }
  if (source === "imdb" || source === "tmdb") {
    return value * 10;
  }
  if (source === "letterboxd") {
    return value * 20;
  }
  return value;
}

/** The fallback when MDBList is not set up: TMDB's own score. */
export function tmdbRating(score: number | null, votes: number): ExternalRating[] {
  if (score === null || votes < 5) {
    return [];
  }
  return [
    {
      source: "tmdb",
      display: score.toFixed(1),
      score: score * 10,
      votes,
      url: null,
    },
  ];
}
