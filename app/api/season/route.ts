import type { NextRequest } from "next/server";

import { getAuthStatus } from "@/lib/auth";
import { parsePositiveInt, parseSeasonNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getTvSeason } from "@/lib/tmdb/client";

export async function GET(request: NextRequest) {
  const auth = await getAuthStatus();
  if (auth.state !== "signed-in") {
    return Response.json({ ok: false }, { status: 401 });
  }

  const showId = parsePositiveInt(request.nextUrl.searchParams.get("show") ?? "");
  const seasonNumber = parseSeasonNumber(
    request.nextUrl.searchParams.get("season") ?? "",
  );
  if (showId === null || seasonNumber === null) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const season = await getTvSeason(showId, seasonNumber);
  if (!season.ok) {
    return Response.json(
      { ok: false, message: season.error.message },
      { status: season.error.kind === "not_found" ? 404 : 503 },
    );
  }

  const supabase = await createClient();
  const watches = await supabase
    .from("episode_watches")
    .select("episode_number")
    .eq("user_id", auth.user.id)
    .eq("show_tmdb_id", showId)
    .eq("season_number", seasonNumber);

  const watched = watches.error
    ? []
    : watches.data.map((row) => row.episode_number);

  return Response.json({
    ok: true,
    name: season.data.name,
    episodes: season.data.episodes,
    watched,
  });
}
