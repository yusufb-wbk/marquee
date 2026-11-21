type HeaderSource = {
  get(name: string): string | null;
};

/** First forwarded address, used only as a rate-limit key. Never logged. */
export function clientAddress(headers: HeaderSource): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim() ?? "";
  if (first.length > 0 && first.length <= 64 && !first.includes(" ")) {
    return first;
  }
  const real = headers.get("x-real-ip")?.trim() ?? "";
  if (real.length > 0 && real.length <= 64 && !real.includes(" ")) {
    return real;
  }
  return "unknown";
}
