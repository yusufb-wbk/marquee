import { cookies } from "next/headers";

import { CSRF_COOKIE, isCsrfToken } from "@/lib/csrf";

export async function readCsrfToken(): Promise<string> {
  const jar = await cookies();
  const token = jar.get(CSRF_COOKIE)?.value ?? "";
  return isCsrfToken(token) ? token : "";
}

export async function CsrfField() {
  const token = await readCsrfToken();
  if (!isCsrfToken(token)) {
    return null;
  }
  return <input type="hidden" name="csrf" value={token} />;
}
