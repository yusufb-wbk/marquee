import type { NextRequest } from "next/server";

import { getAuthStatus } from "@/lib/auth";
import { mapWithLimit } from "@/lib/concurrency";
import { getExternalRatings } from "@/lib/mdblist";

/** Most titles per request: one page of a list. */
const MAX_IDS = 60;
const MDBLIST_CONCURRENCY = 3;

/**
 * Combined MDBList scores for list rows. `ids` is "movie-603,tv-1396".
 * Each score is cached for days, so a list mostly costs no MDBList requests.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthStatus();
  if (auth.state !== "signed-in") {
    return Response.json({ ok: false }, { status: 401 });
  }

  const ids = [
    ...new Set(
      (request.nextUrl.searchParams.get("ids") ?? "")
        .split(",")
        .filter((id) => /^(movie|tv)-[1-9][0-9]{0,9}$/.test(id)),
    ),
  ].slice(0, MAX_IDS);
  if (ids.length === 0) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const scores = await mapWithLimit(ids, MDBLIST_CONCURRENCY, async (id) => {
    const [kind, tmdbId] = id.split("-") as ["movie" | "tv", string];
    const result = await getExternalRatings(kind, Number(tmdbId));
    return [id, result?.score ?? null] as const;
  });
  return Response.json(
    { ok: true, scores: Object.fromEntries(scores) },
    { headers: { "cache-control": "private, max-age=3600" } },
  );
}
