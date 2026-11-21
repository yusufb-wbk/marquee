import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";
import { redirectTo, supabaseForResponse } from "@/lib/supabase/route";

const EMAIL_OTP_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const satisfies readonly EmailOtpType[];

function isEmailOtpType(value: string): value is (typeof EMAIL_OTP_TYPES)[number] {
  return (EMAIL_OTP_TYPES as readonly string[]).includes(value);
}

function safeNextPath(value: string): string {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("://")
  ) {
    return "/";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";
  const destination = safeNextPath(next);

  if (!getSupabaseEnv() || !tokenHash || !type || !isEmailOtpType(type)) {
    return redirectTo(request, "/login?error=confirm");
  }

  const response = redirectTo(request, destination);
  const supabase = supabaseForResponse(request, response);
  if (!supabase) {
    return redirectTo(request, "/login?error=confirm");
  }

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    return redirectTo(request, "/login?error=confirm");
  }

  return response;
}
