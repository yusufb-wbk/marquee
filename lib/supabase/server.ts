import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@/lib/library/database";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Server Supabase client for this request.
 * The session lives in cookies. Proxy refreshes those cookies;
 * Server Components often cannot write them, so setAll ignores that failure.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error("Supabase is not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component. Proxy writes the refreshed cookies.
        }
      },
    },
  });
}
