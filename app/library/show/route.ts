import type { NextRequest } from "next/server";

import { postLibrary } from "@/lib/library/finish";
import { saveShowStatus } from "@/lib/library/save";
import { parsePositiveInt } from "@/lib/format";

export async function POST(request: NextRequest) {
  return postLibrary(request, async (userId, formData) => {
    const tmdbId = parsePositiveInt(readText(formData.get("tmdbId")));
    const status = readText(formData.get("status"));
    if (tmdbId === null || status.length === 0) {
      return { ok: false, error: "save" };
    }
    return saveShowStatus(userId, tmdbId, status);
  });
}

function readText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
