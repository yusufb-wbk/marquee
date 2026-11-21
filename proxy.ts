import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { CSRF_COOKIE, csrfForRequest } from "@/lib/csrf";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Refreshes the Supabase session cookie and sends signed-out visitors to /login.
 * The session is checked again in Server Components with getClaims().
 * Proxy alone is not the authorization check.
 */
export async function proxy(request: NextRequest) {
  const csrf = csrfForRequest(request.cookies.get(CSRF_COOKIE)?.value);
  request.cookies.set(CSRF_COOKIE, csrf);

  const env = getSupabaseEnv();
  if (!env) {
    return withCsrf(NextResponse.next({ request }), csrf);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  let signedIn = false;
  try {
    const { data, error } = await supabase.auth.getClaims();
    signedIn = !error && data !== null;
  } catch {
    signedIn = false;
  }

  const { pathname } = request.nextUrl;
  const isPublic =
    pathname.startsWith("/login") || pathname.startsWith("/auth");

  if (!signedIn && !isPublic) {
    return redirectWithSession(request, supabaseResponse, "/login", csrf);
  }

  if (signedIn && pathname.startsWith("/login")) {
    return redirectWithSession(request, supabaseResponse, "/up-next", csrf);
  }

  return withCsrf(supabaseResponse, csrf);
}

function redirectWithSession(
  request: NextRequest,
  supabaseResponse: NextResponse,
  pathname: string,
  csrf: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirectResponse = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = supabaseResponse.headers.get(header);
    if (value) {
      redirectResponse.headers.set(header, value);
    }
  }
  return withCsrf(redirectResponse, csrf);
}

function withCsrf(response: NextResponse, csrf: string) {
  response.cookies.set(CSRF_COOKIE, csrf, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
