"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type AuthFormState = {
  error: string | null;
  notice: string | null;
};

export async function authenticate(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!getSupabaseEnv()) {
    return {
      error:
        "Supabase is not configured. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to .env.local, then restart the dev server.",
      notice: null,
    };
  }

  const intent = formData.get("intent") === "signup" ? "signup" : "login";
  const email = readEmail(formData.get("email"));
  const password = formData.get("password");

  if (!email) {
    return { error: "Enter a valid email address.", notice: null };
  }
  if (typeof password !== "string" || password.length < 8) {
    return {
      error: "Use a password of at least 8 characters.",
      notice: null,
    };
  }

  const supabase = await createClient();

  if (intent === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { error: friendlyAuthError(error.message), notice: null };
    }
    if (!data.session) {
      return {
        error: null,
        notice:
          "Check your email for a confirmation link, then log in. You can turn off email confirmation in the Supabase dashboard while you are testing.",
      };
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { error: friendlyAuthError(error.message), notice: null };
    }
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  if (getSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
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

function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "That email and password don't match.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirm your email first. The link is in your inbox.";
  }
  if (
    normalized.includes("already registered") ||
    normalized.includes("already been registered")
  ) {
    return "An account with that email already exists. Log in instead.";
  }
  if (message.trim().length === 0) {
    return "Supabase could not complete that request. Try again.";
  }
  return message;
}
