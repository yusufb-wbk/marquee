import { cookies } from "next/headers";

import { CSRF_COOKIE, isCsrfToken } from "@/lib/csrf";

export async function CsrfField() {
  const jar = await cookies();
  const token = jar.get(CSRF_COOKIE)?.value ?? "";
  if (!isCsrfToken(token)) {
    return null;
  }
  return <input type="hidden" name="csrf" value={token} />;
}
