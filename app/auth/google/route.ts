import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { clientAddress } from "@/lib/client-address";
import { CSRF_COOKIE, csrfMatches } from "@/lib/csrf";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { browserOrigin, redirectTo } from "@/lib/supabase/route";

const GOOGLE_PER_ADDRESS = { limit: 20, windowMs: 15 * 60 * 1000 };

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  if (!csrfMatches(request.cookies.get(CSRF_COOKIE)?.value, formData.get("csrf"))) {
    return redirectTo(request, "/login?error=rejected");
  }
  if (!getSupabaseEnv()) {
    return redirectTo(request, "/login?error=unconfigured");
  }
  if (!consumeRateLimit(`google:${clientAddress(request.headers)}`, GOOGLE_PER_ADDRESS)) {
    return redirectTo(request, "/login?error=slow");
  }

  const env = getSupabaseEnv();
  if (!env) {
    return redirectTo(request, "/login?error=unconfigured");
  }
  const stored: {
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }[] = [];
  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        stored.splice(0, stored.length);
        for (const cookie of cookiesToSet) {
          stored.push(cookie);
        }
      },
    },
  });

  const origin = browserOrigin(request);
  let target: string | null = null;
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url || !isHttps(data.url)) {
      console.error("Google sign-in did not start:", error?.message ?? "missing url");
      return redirectTo(request, "/login?error=google");
    }
    target = data.url;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("Google sign-in request failed:", message);
    return redirectTo(request, "/login?error=offline");
  }

  const response = NextResponse.redirect(target, 303);
  for (const cookie of stored) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  return response;
}

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
