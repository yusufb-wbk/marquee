import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isSameOriginPost, type OriginCheck } from "./same-origin.ts";

function check(overrides: Partial<OriginCheck>): boolean {
  return isSameOriginPost({
    originHeader: null,
    refererHeader: null,
    fetchSite: null,
    requestOrigin: "http://localhost:3847",
    forwardedHost: null,
    forwardedProto: null,
    hostHeader: "localhost:3847",
    ...overrides,
  });
}

describe("same-origin form posts", () => {
  it("allows the app's own origin", () => {
    assert.equal(
      check({ originHeader: "http://localhost:3847", fetchSite: "same-origin" }),
      true,
    );
  });

  it("allows the public host when the runtime origin is internal", () => {
    assert.equal(
      check({
        originHeader: "https://marquee.example",
        fetchSite: "same-origin",
        requestOrigin: "http://127.0.0.1:3000",
        forwardedHost: "marquee.example",
        forwardedProto: "https",
        hostHeader: "127.0.0.1:3000",
      }),
      true,
    );
  });

  it("rejects another site's origin", () => {
    assert.equal(
      check({ originHeader: "https://evil.example", fetchSite: "cross-site" }),
      false,
    );
  });

  it("rejects a cross-site fetch even when Origin was copied", () => {
    assert.equal(
      check({
        originHeader: "http://localhost:3847",
        fetchSite: "cross-site",
      }),
      false,
    );
  });

  it("falls back to Referer when Origin is missing", () => {
    assert.equal(
      check({ refererHeader: "http://localhost:3847/login", fetchSite: null }),
      true,
    );
    assert.equal(
      check({ refererHeader: "https://evil.example/login", fetchSite: null }),
      false,
    );
  });

  it("rejects a post with no origin evidence", () => {
    assert.equal(check({}), false);
  });
});
