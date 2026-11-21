import { type NextRequest } from "next/server";

import { CSRF_COOKIE, csrfMatches } from "@/lib/csrf";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { redirectTo, supabaseForResponse } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  if (!csrfMatches(request.cookies.get(CSRF_COOKIE)?.value, formData.get("csrf"))) {
    return redirectTo(request, "/up-next?library=rejected");
  }

  const response = redirectTo(request, "/login");
  if (!getSupabaseEnv()) {
    return response;
  }

  const supabase = supabaseForResponse(request, response);
  if (!supabase) {
    return response;
  }

  try {
    await supabase.auth.signOut();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("Sign-out request failed:", message);
  }

  return response;
}
