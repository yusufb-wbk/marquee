import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";

/** Absolute redirect that keeps only the path and query from `path`. */
export function redirectTo(request: NextRequest, path: string): NextResponse {
  const url = request.nextUrl.clone();
  const target = new URL(path, request.url);
  url.pathname = target.pathname;
  url.search = target.search;
  return NextResponse.redirect(url, 303);
}

/**
 * Supabase client whose session cookies are written onto `response`.
 * Route handlers return their own Response, so cookies set through
 * `cookies()` from `next/headers` are not attached to that redirect.
 */
export function supabaseForResponse(
  request: NextRequest,
  response: NextResponse,
) {
  const env = getSupabaseEnv();
  if (!env) {
    return null;
  }

  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });
}
