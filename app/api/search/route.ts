import { NextResponse, type NextRequest } from "next/server";

import { getAuthStatus } from "@/lib/auth";
import { normalizeSearchQuery } from "@/lib/search-query";
import { toSuggestions } from "@/lib/search-suggestions";
import { searchTitles } from "@/lib/tmdb/client";

export async function GET(request: NextRequest) {
  const status = await getAuthStatus();
  if (status.state !== "signed-in") {
    return NextResponse.json({ titles: [] }, { status: 401 });
  }

  const normalized = normalizeSearchQuery(
    request.nextUrl.searchParams.get("q") ?? "",
  );
  if (!normalized) {
    return NextResponse.json(
      { titles: [] },
      { headers: { "cache-control": "private, no-store" } },
    );
  }

  const result = await searchTitles(normalized, status.user.id);
  if (!result.ok) {
    const statusCode = result.error.kind === "rate_limit" ? 429 : 503;
    return NextResponse.json(
      { titles: [] },
      {
        status: statusCode,
        headers: { "cache-control": "private, no-store" },
      },
    );
  }

  return NextResponse.json(
    { titles: toSuggestions(result.data) },
    { headers: { "cache-control": "private, no-store" } },
  );
}
