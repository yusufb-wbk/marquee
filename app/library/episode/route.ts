import type { NextRequest } from "next/server";

import { parsePositiveInt, parseSeasonNumber } from "@/lib/format";
import { postLibrary } from "@/lib/library/finish";
import { saveEpisode } from "@/lib/library/save";

export async function POST(request: NextRequest) {
  return postLibrary(request, async (userId, formData) => {
    const showId = parsePositiveInt(readText(formData.get("showId")));
    const seasonNumber = parseSeasonNumber(readText(formData.get("season")));
    const episodeNumber = parsePositiveInt(readText(formData.get("episode")));
    const intent = readText(formData.get("intent"));
    if (showId === null || seasonNumber === null || episodeNumber === null) {
      return { ok: false, error: "save" };
    }
    return saveEpisode(
      userId,
      showId,
      seasonNumber,
      episodeNumber,
      intent,
      formData.get("rating"),
      formData.get("note"),
    );
  });
}

function readText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
