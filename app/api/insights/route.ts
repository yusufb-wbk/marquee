import { NextResponse } from "next/server";

import { getAuthStatus } from "@/lib/auth";
import { loadInsightsLibrary } from "@/lib/library/queries";

/**
 * Data for the Insights tab, fetched when the tab is first opened, so the
 * Profile page itself does not carry every episode's runtime and date.
 */
export async function GET() {
  const status = await getAuthStatus();
  if (status.state !== "signed-in") {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const library = await loadInsightsLibrary(status.user.id);
  if (!library.ok) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const { shows, movies, episodes } = library.data;
  return NextResponse.json(
    {
      ok: true,
      shows: shows.map(({ tmdbId, title, status: state, year, genres, rating }) => ({
        tmdbId,
        title,
        status: state,
        year,
        genres,
        rating,
      })),
      movies: movies.map(({ title, status: state, year, genres, runtimeMinutes, watchedOn, rating }) => ({
        title,
        status: state,
        year,
        genres,
        runtimeMinutes,
        watchedOn,
        rating,
      })),
      episodes,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
