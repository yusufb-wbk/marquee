import type { NextRequest } from "next/server";

import { clientAddress } from "@/lib/client-address";
import { postLibrary } from "@/lib/library/finish";
import { importImdbCsv } from "@/lib/library/import-imdb";
import { consumeRateLimit } from "@/lib/rate-limit";

const IMPORT_PER_USER = { limit: 6, windowMs: 60 * 60 * 1000 };
const MAX_BYTES = 1_500_000;

export async function POST(request: NextRequest) {
  return postLibrary(request, async (userId, formData) => {
    if (!consumeRateLimit(`import:${userId}`, IMPORT_PER_USER)) {
      return { ok: false, error: "save" };
    }
    if (!consumeRateLimit(`import-ip:${clientAddress(request.headers)}`, IMPORT_PER_USER)) {
      return { ok: false, error: "save" };
    }
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { ok: false, error: "save" };
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      return { ok: false, error: "save" };
    }
    const csv = await file.text();
    return importImdbCsv(userId, csv);
  });
}
