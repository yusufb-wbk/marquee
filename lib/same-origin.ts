export type OriginCheck = {
  originHeader: string | null;
  refererHeader: string | null;
  fetchSite: string | null;
  requestOrigin: string;
  forwardedHost: string | null;
  forwardedProto: string | null;
  hostHeader: string | null;
};

type HeaderSource = {
  headers: { get(name: string): string | null };
  nextUrl: { origin: string };
};

/** True when a browser form post is from this app, not another site. */
export function isSameOriginPost(input: OriginCheck): boolean {
  if (input.fetchSite === "cross-site" || input.fetchSite === "same-site") {
    return false;
  }

  const allowed = allowedOrigins(input);
  if (input.originHeader) {
    const origin = readOrigin(input.originHeader);
    return origin !== null && allowed.has(origin);
  }

  if (input.refererHeader) {
    const origin = readOrigin(input.refererHeader);
    return origin !== null && allowed.has(origin);
  }

  return input.fetchSite === "same-origin" || input.fetchSite === "none";
}

export function requestIsSameOrigin(request: HeaderSource): boolean {
  return isSameOriginPost({
    originHeader: request.headers.get("origin"),
    refererHeader: request.headers.get("referer"),
    fetchSite: request.headers.get("sec-fetch-site"),
    requestOrigin: request.nextUrl.origin,
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    hostHeader: request.headers.get("host"),
  });
}

function readOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function firstToken(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const token = value.split(",")[0]?.trim() ?? "";
  return token.length > 0 ? token : null;
}

function allowedOrigins(input: OriginCheck): Set<string> {
  const origins = new Set<string>();
  if (input.requestOrigin.length > 0) {
    origins.add(input.requestOrigin);
  }

  const host = firstToken(input.forwardedHost) ?? firstToken(input.hostHeader);
  if (!host || host.includes("/") || host.includes(" ")) {
    return origins;
  }

  const proto = firstToken(input.forwardedProto);
  if (proto === "http" || proto === "https") {
    origins.add(`${proto}://${host}`);
  }
  origins.add(`https://${host}`);
  origins.add(`http://${host}`);
  return origins;
}
