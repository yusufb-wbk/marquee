import "server-only";

import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import type { LibraryResult } from "@/lib/library/queries";
import { requireUser } from "@/lib/require-user";
import { requestIsSameOrigin } from "@/lib/same-origin";
import { pathWithLibrary, safeNextPath } from "@/lib/safe-path";

export async function postLibrary(
  request: NextRequest,
  run: (userId: string, formData: FormData) => Promise<LibraryResult<true>>,
): Promise<never> {
  const formData = await request.formData();
  const nextValue = formData.get("next");
  const next = safeNextPath(
    typeof nextValue === "string" ? nextValue : "",
    "/up-next",
  );
  if (!requestIsSameOrigin(request)) {
    redirect(pathWithLibrary(next, "rejected"));
  }

  const user = await requireUser();
  const result = await run(user.id, formData);
  redirect(result.ok ? next : pathWithLibrary(next, result.error));
}
