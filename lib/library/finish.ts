import "server-only";

import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { getAuthStatus } from "@/lib/auth";
import { CSRF_COOKIE, csrfMatches } from "@/lib/csrf";
import type { LibraryResult } from "@/lib/library/queries";
import { pathWithLibrary, safeNextPath } from "@/lib/safe-path";

function wantsJson(request: NextRequest): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

export async function postLibrary<T>(
  request: NextRequest,
  run: (userId: string, formData: FormData) => Promise<LibraryResult<T>>,
): Promise<Response> {
  const formData = await request.formData();
  const json = wantsJson(request);
  const nextValue = formData.get("next");
  const next = safeNextPath(
    typeof nextValue === "string" ? nextValue : "",
    "/up-next",
  );
  if (!csrfMatches(request.cookies.get(CSRF_COOKIE)?.value, formData.get("csrf"))) {
    if (json) {
      return Response.json({ ok: false, error: "rejected" }, { status: 403 });
    }
    redirect(pathWithLibrary(next, "rejected"));
  }

  const auth = await getAuthStatus();
  if (auth.state !== "signed-in") {
    if (json) {
      return Response.json({ ok: false, error: "save" }, { status: 401 });
    }
    redirect("/login");
  }

  const result = await run(auth.user.id, formData);
  if (json) {
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 422 });
    }
    return Response.json({ ok: true, data: result.data });
  }
  redirect(result.ok ? next : pathWithLibrary(next, result.error));
}
