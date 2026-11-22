import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Same-origin redirect that keeps only the path and query from `path`.
 * The Location is relative on purpose. `request.nextUrl` holds the address the
 * server listens on (0.0.0.0 in dev), not the one the browser used. An absolute
 * redirect there leaves the site, and CSP `form-action 'self'` blocks it.
 */
export function redirectTo(request: NextRequest, path: string): NextResponse {
  const target = new URL(path, request.url);
  return new NextResponse(null, {
    status: 303,
    headers: { Location: `${target.pathname}${target.search}` },
  });
}

/** The origin the browser used, from the Host header, such as http://localhost:3847. */
export function browserOrigin(request: NextRequest): string {
  const host = request.headers.get("host");
  if (!host || host.includes("/") || host.includes(" ")) {
    return request.nextUrl.origin;
  }
  return `${request.nextUrl.protocol}//${host}`;
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
