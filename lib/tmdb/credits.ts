/** Cast, crew, trailers and people from TMDB. Pure parsing; no I/O. */

export type CastMember = {
  id: number;
  name: string;
  character: string;
  profileUrl: string | null;
  /** Episodes the actor is in, for shows. */
  episodes: number | null;
};

export type CrewMember = { id: number; name: string; job: string };

export type Trailer = { key: string; name: string };

export type TitleExtras = {
  cast: CastMember[];
  crew: CrewMember[];
  trailer: Trailer | null;
  imdbId: string | null;
  /** TMDB's own audience score, 0–10, and how many votes it is based on. */
  tmdbScore: number | null;
  tmdbVotes: number;
};

export type PersonCredit = {
  kind: "movie" | "tv";
  id: number;
  title: string;
  year: string | null;
  posterUrl: string | null;
  role: string;
  votes: number;
};

export type Person = {
  id: number;
  name: string;
  biography: string;
  department: string | null;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  profileUrl: string | null;
  imdbId: string | null;
  credits: PersonCredit[];
};

const CAST_LIMIT = 24;
/** Jobs worth naming on a title page. */
const KEY_JOBS = ["Director", "Creator", "Screenplay", "Writer", "Novel", "Original Music Composer"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function id(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function imagePath(value: unknown): string | null {
  const path = text(value);
  return path.startsWith("/") && !path.includes("..") && !path.includes("\\") ? path : null;
}

function image(path: string | null, size: "w185" | "w342"): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

function date(value: unknown): string | null {
  const value_ = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(value_) ? value_ : null;
}

function imdbId(value: unknown): string | null {
  const value_ = text(value);
  return /^(tt|nm)\d{7,10}$/.test(value_) ? value_ : null;
}

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

/** `body` is /movie/{id} or /tv/{id} with append_to_response=credits|aggregate_credits,videos,external_ids. */
export function parseTitleExtras(body: unknown, kind: "movie" | "tv"): TitleExtras | null {
  if (!isRecord(body)) {
    return null;
  }

  const castSource =
    kind === "tv" && isRecord(body.aggregate_credits) ? body.aggregate_credits : body.credits;
  const cast: CastMember[] = [];
  for (const item of list(isRecord(castSource) ? castSource.cast : null)) {
    const personId = id(item.id);
    const name = text(item.name);
    if (personId === null || name.length === 0) {
      continue;
    }
    // Shows list a person once with all their roles; movies give one character.
    const roles = list(item.roles);
    const character =
      roles.length > 0
        ? roles.map((role) => text(role.character)).filter(Boolean).slice(0, 2).join(" / ")
        : text(item.character);
    const episodes =
      typeof item.total_episode_count === "number" ? item.total_episode_count : null;
    cast.push({
      id: personId,
      name,
      character,
      profileUrl: image(imagePath(item.profile_path), "w185"),
      episodes,
    });
    if (cast.length >= CAST_LIMIT) {
      break;
    }
  }

  const crew: CrewMember[] = [];
  const seen = new Set<string>();
  const addCrew = (personId: number | null, name: string, job: string) => {
    const key = `${personId}:${job}`;
    if (personId === null || name.length === 0 || seen.has(key)) {
      return;
    }
    seen.add(key);
    crew.push({ id: personId, name, job });
  };
  for (const creator of list(body.created_by)) {
    addCrew(id(creator.id), text(creator.name), "Creator");
  }
  const crewSource = isRecord(castSource) ? castSource.crew : null;
  for (const item of list(crewSource)) {
    const jobs = list(item.jobs);
    const names = jobs.length > 0 ? jobs.map((job) => text(job.job)) : [text(item.job)];
    for (const job of names) {
      if (KEY_JOBS.includes(job)) {
        addCrew(id(item.id), text(item.name), job);
      }
    }
  }
  crew.sort((a, b) => KEY_JOBS.indexOf(a.job) - KEY_JOBS.indexOf(b.job));

  return {
    cast,
    crew: crew.slice(0, 6),
    trailer: pickTrailer(isRecord(body.videos) ? body.videos.results : null),
    imdbId: imdbId(body.imdb_id) ?? imdbId(isRecord(body.external_ids) ? body.external_ids.imdb_id : null),
    tmdbScore:
      typeof body.vote_average === "number" && body.vote_average > 0 ? body.vote_average : null,
    tmdbVotes: typeof body.vote_count === "number" ? body.vote_count : 0,
  };
}

/** The best YouTube trailer: official first, then a trailer, then a teaser. */
function pickTrailer(value: unknown): Trailer | null {
  const videos = list(value).filter(
    (video) => text(video.site) === "YouTube" && /^[\w-]{6,20}$/.test(text(video.key)),
  );
  const rank = (video: Record<string, unknown>) =>
    (text(video.type) === "Trailer" ? 0 : text(video.type) === "Teaser" ? 2 : 4) +
    (video.official === true ? 0 : 1);
  const best = videos
    .filter((video) => ["Trailer", "Teaser"].includes(text(video.type)))
    .sort((a, b) => rank(a) - rank(b))[0];
  return best ? { key: text(best.key), name: text(best.name) || "Trailer" } : null;
}

/** `body` is /person/{id} with append_to_response=combined_credits,external_ids. */
export function parsePerson(body: unknown): Person | null {
  if (!isRecord(body)) {
    return null;
  }
  const personId = id(body.id);
  const name = text(body.name);
  if (personId === null || name.length === 0) {
    return null;
  }

  const byTitle = new Map<string, PersonCredit>();
  const combined = isRecord(body.combined_credits) ? body.combined_credits : {};
  for (const item of [...list(combined.cast), ...list(combined.crew)]) {
    const kind = text(item.media_type);
    const titleId = id(item.id);
    if ((kind !== "movie" && kind !== "tv") || titleId === null) {
      continue;
    }
    const title = text(kind === "movie" ? item.title : item.name);
    if (title.length === 0) {
      continue;
    }
    const role = text(item.character) || text(item.job);
    const key = `${kind}:${titleId}`;
    const existing = byTitle.get(key);
    if (existing) {
      // One person can have several roles on a title; keep them together.
      if (role && !existing.role.split(" · ").includes(role)) {
        existing.role = existing.role ? `${existing.role} · ${role}` : role;
      }
      continue;
    }
    const released = date(kind === "movie" ? item.release_date : item.first_air_date);
    byTitle.set(key, {
      kind,
      id: titleId,
      title,
      year: released ? released.slice(0, 4) : null,
      posterUrl: image(imagePath(item.poster_path), "w342"),
      role,
      votes: typeof item.vote_count === "number" ? item.vote_count : 0,
    });
  }

  const department = text(body.known_for_department);
  const place = text(body.place_of_birth);
  return {
    id: personId,
    name,
    biography: text(body.biography),
    department: department || null,
    birthday: date(body.birthday),
    deathday: date(body.deathday),
    placeOfBirth: place || null,
    profileUrl: image(imagePath(body.profile_path), "w342"),
    imdbId: imdbId(body.imdb_id) ?? imdbId(isRecord(body.external_ids) ? body.external_ids.imdb_id : null),
    credits: [...byTitle.values()],
  };
}
