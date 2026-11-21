import "server-only";

import { cache } from "react";
import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type CurrentUser = {
  id: string;
  email: string | null;
};

export type AuthStatus =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "signed-in"; user: CurrentUser };

/**
 * Who is signed in for this request.
 * `getClaims()` checks the session cookie's signature. `getSession()` does not,
 * so it is not used for access decisions.
 */
export const getAuthStatus = cache(async (): Promise<AuthStatus> => {
  await connection();

  if (!getSupabaseEnv()) {
    return { state: "unconfigured" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) {
    return { state: "signed-out" };
  }

  const email =
    typeof data.claims.email === "string" && data.claims.email.length > 0
      ? data.claims.email
      : null;

  return {
    state: "signed-in",
    user: { id: data.claims.sub, email },
  };
});
