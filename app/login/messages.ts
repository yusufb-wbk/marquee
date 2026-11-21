export type AuthAlert = {
  tone: "error" | "notice";
  title: string;
  body: string | null;
};

const alerts: Record<string, AuthAlert> = {
  email: {
    tone: "error",
    title: "Enter a valid email address.",
    body: null,
  },
  password: {
    tone: "error",
    title: "Use a password of at least 8 characters.",
    body: null,
  },
  credentials: {
    tone: "error",
    title: "That email and password don't match.",
    body: null,
  },
  unconfirmed: {
    tone: "error",
    title: "Confirm your email first.",
    body: "The link is in your inbox.",
  },
  exists: {
    tone: "error",
    title: "An account with that email already exists.",
    body: "Log in instead.",
  },
  "check-email": {
    tone: "notice",
    title: "Check your email for a confirmation link.",
    body: "Open the link, then log in. You can turn off email confirmation in the Supabase dashboard while you are testing.",
  },
  unavailable: {
    tone: "error",
    title: "Supabase did not accept that request.",
    body: "Nothing was saved. Try again, or check the email settings in your Supabase project.",
  },
  offline: {
    tone: "error",
    title: "Marquee could not reach Supabase.",
    body: "Nothing was saved. Try again in a moment.",
  },
  unconfigured: {
    tone: "error",
    title: "Supabase is not configured.",
    body: "Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY, then restart.",
  },
  confirm: {
    tone: "error",
    title: "That confirmation link did not work.",
    body: "It may have expired. Log in, or create the account again.",
  },
  rejected: {
    tone: "error",
    title: "Reload the page and try again.",
    body: "That sign-in form was out of date.",
  },
  slow: {
    tone: "error",
    title: "Too many attempts.",
    body: "Wait a while, then try again. New accounts are limited so search cannot burn through the TMDB key.",
  },
};

export function authAlert(code: string): AuthAlert {
  return (
    alerts[code] ?? {
      tone: "error",
      title: "That request did not work.",
      body: "Try again.",
    }
  );
}

/** Map a Supabase auth message to a short code. The raw message stays off the URL. */
export function authErrorCode(message: string): string {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("fetch failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network")
  ) {
    return "offline";
  }
  if (normalized.includes("invalid login credentials")) {
    return "credentials";
  }
  if (normalized.includes("email not confirmed")) {
    return "unconfirmed";
  }
  if (
    normalized.includes("already registered") ||
    normalized.includes("already been registered")
  ) {
    return "exists";
  }
  return "unavailable";
}
