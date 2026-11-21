import type { NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";
import { redirectTo, supabaseForResponse } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  if (!getSupabaseEnv() || request.nextUrl.searchParams.get("error")) {
    return redirectTo(request, "/login?error=google");
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return redirectTo(request, "/login?error=google");
  }

  const response = redirectTo(request, "/up-next");
  const supabase = supabaseForResponse(request, response);
  if (!supabase) {
    return redirectTo(request, "/login?error=unconfigured");
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Google sign-in callback failed:", error.message);
    return redirectTo(request, "/login?error=google");
  }

  return response;
}
