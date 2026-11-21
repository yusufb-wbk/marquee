import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { episodeOverview, titleOverview } from "./overview.ts";

describe("episode overview fallback", () => {
  const today = "2026-11-22";

  it("keeps a real summary", () => {
    assert.equal(episodeOverview("They open a firm.", "2026-10-08", today), "They open a firm.");
  });

  it("says an upcoming episode is not out yet", () => {
    assert.equal(episodeOverview("", "2026-12-01", today), "Not out yet");
    assert.equal(episodeOverview("   ", null, today), "Not out yet");
  });

  it("says N/A when an aired episode has no summary", () => {
    assert.equal(episodeOverview("", "2026-11-12", today), "N/A");
    assert.equal(episodeOverview("", "2026-11-22", today), "N/A");
  });

  it("says N/A for a movie or show with no summary", () => {
    assert.equal(titleOverview(""), "N/A");
    assert.equal(titleOverview("A lawyer in Tulsa."), "A lawyer in Tulsa.");
  });
});
