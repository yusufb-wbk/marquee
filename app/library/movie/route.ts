import type { NextRequest } from "next/server";

import { parsePositiveInt } from "@/lib/format";
import { postLibrary } from "@/lib/library/finish";
import { saveMovieStatus } from "@/lib/library/save";

export async function POST(request: NextRequest) {
  return postLibrary(request, async (userId, formData) => {
    const tmdbId = parsePositiveInt(readText(formData.get("tmdbId")));
    const status = readText(formData.get("status"));
    if (tmdbId === null || status.length === 0) {
      return { ok: false, error: "save" };
    }
    return saveMovieStatus(
      userId,
      tmdbId,
      status,
      formData.get("watchedOn"),
      formData.get("rating"),
      formData.get("note"),
    );
  });
}

function readText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
