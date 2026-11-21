export const CSRF_COOKIE = "marquee_csrf";

export function isCsrfToken(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

export function newCsrfToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Keep a valid cookie value, or mint one for this request. */
export function csrfForRequest(existing: string | undefined): string {
  if (existing && isCsrfToken(existing)) {
    return existing;
  }
  return newCsrfToken();
}

export function csrfMatches(
  cookie: string | undefined,
  field: FormDataEntryValue | null,
): boolean {
  if (typeof cookie !== "string" || typeof field !== "string") {
    return false;
  }
  if (!isCsrfToken(cookie) || cookie.length !== field.length) {
    return false;
  }
  const mismatch = Array.from(cookie).reduce((bit, char, index) => {
    return bit | (char.charCodeAt(0) ^ field.charCodeAt(index));
  }, 0);
  return mismatch === 0;
}
