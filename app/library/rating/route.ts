import type { NextRequest } from "next/server";

import { parsePositiveInt } from "@/lib/format";
import { postLibrary } from "@/lib/library/finish";
import { saveTrackedRating } from "@/lib/library/save";

export async function POST(request: NextRequest) {
  return postLibrary(request, async (userId, formData) => {
    const tmdbId = parsePositiveInt(readText(formData.get("tmdbId")));
    if (tmdbId === null) {
      return { ok: false, error: "save" };
    }
    return saveTrackedRating(userId, readText(formData.get("kind")), tmdbId, formData.get("rating"));
  });
}

function readText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
