import { type NextRequest } from "next/server";

import { authErrorCode } from "@/app/login/messages";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { redirectTo, supabaseForResponse } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const intent = formData.get("intent") === "signup" ? "signup" : "login";

  if (!getSupabaseEnv()) {
    return redirectTo(request, "/login?error=unconfigured");
  }

  const email = readEmail(formData.get("email"));
  const password = formData.get("password");
  if (!email) {
    return redirectTo(request, "/login?error=email");
  }
  if (typeof password !== "string" || password.length < 8) {
    return redirectTo(request, "/login?error=password");
  }

  const response = redirectTo(request, "/up-next");
  const supabase = supabaseForResponse(request, response);
  if (!supabase) {
    return redirectTo(request, "/login?error=unconfigured");
  }

  try {
    if (intent === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        console.error("Supabase sign-up refused:", error.message);
        return redirectTo(request, `/login?error=${authErrorCode(error.message)}`);
      }
      if (!data.session) {
        return redirectTo(request, "/login?error=check-email");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        console.error("Supabase log-in refused:", error.message);
        return redirectTo(
          request,
          `/login?error=${authErrorCode(error.message)}`,
        );
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("Sign-in request failed:", message);
    return redirectTo(request, "/login?error=offline");
  }

  return response;
}

function readEmail(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }
  return email;
}
