/** Same-origin path only. Rejects protocol-relative and header-breaking paths. */
export function safeNextPath(value: string, fallback: string): string {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("://") ||
    /[\u0000-\u001F]/.test(value)
  ) {
    return fallback;
  }
  return value;
}

export function pathWithLibrary(path: string, code: string): string {
  const url = new URL(path, "https://marquee.local");
  url.searchParams.set("library", code);
  return `${url.pathname}${url.search}`;
}
