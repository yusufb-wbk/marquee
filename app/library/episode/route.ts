import type { NextRequest } from "next/server";

import { parsePositiveInt, parseSeasonNumber } from "@/lib/format";
import { postLibrary } from "@/lib/library/finish";
import { loadShowProgress } from "@/lib/library/queries";
import { saveEpisode } from "@/lib/library/save";
import { lookupNextEpisode, watchedKeys, type NextLookup } from "@/lib/library/up-next";

export async function POST(request: NextRequest) {
  return postLibrary<true | { next: NextLookup }>(request, async (userId, formData) => {
    const showId = parsePositiveInt(readText(formData.get("showId")));
    const seasonNumber = parseSeasonNumber(readText(formData.get("season")));
    const episodeNumber = parsePositiveInt(readText(formData.get("episode")));
    const intent = readText(formData.get("intent"));
    if (showId === null || seasonNumber === null || episodeNumber === null) {
      return { ok: false, error: "save" as const };
    }
    const saved = await saveEpisode(
      userId,
      showId,
      seasonNumber,
      episodeNumber,
      intent,
      formData.get("rating"),
      formData.get("note"),
    );
    if (!saved.ok || formData.get("advance") !== "1") {
      return saved;
    }
    const progress = await loadShowProgress(userId, showId);
    if (!progress.ok) {
      return {
        ok: true as const,
        data: {
          next: {
            state: "error" as const,
            message: "Saved. Open the show if the next episode does not appear.",
          },
        },
      };
    }
    const next = await lookupNextEpisode(
      showId,
      watchedKeys(progress.data.episodes),
    );
    return { ok: true as const, data: { next } };
  });
}

function readText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
