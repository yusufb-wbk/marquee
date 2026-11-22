import { readEnv } from "@/lib/env";

export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

/**
 * Supabase URL plus the publishable (anon) key.
 * The service_role key is intentionally not read. It bypasses row-level security.
 */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = readEnv("SUPABASE_URL") ?? readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey =
    readEnv("SUPABASE_PUBLISHABLE_KEY") ??
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ??
    readEnv("SUPABASE_ANON_KEY") ??
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const origin = url ? allowedSupabaseOrigin(url) : null;
  if (!origin || !publishableKey) {
    return null;
  }

  return { url: origin, publishableKey };
}

/**
 * Returns only the origin, such as https://xxxx.supabase.co.
 * Supabase's API page also shows the REST endpoint (…/rest/v1/). If that is pasted,
 * the client sends auth calls to /rest/v1/auth/v1/…, and Supabase refuses them.
 */
function allowedSupabaseOrigin(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol === "https:") {
    return url.origin;
  }

  const isLocalHost =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";
  return url.protocol === "http:" && isLocalHost ? url.origin : null;
}
