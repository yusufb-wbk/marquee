import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { confirmedThisYear, showsAiringThisYear } from "./calendar.ts";
import { showsWithANextEpisode } from "./queue.ts";

describe("up next queue", () => {
  it("drops a show that has no episode left to watch", () => {
    const queued = showsWithANextEpisode([
      { id: 1, next: { state: "ready" } },
      { id: 2, next: { state: "caught_up" } },
      { id: 3, next: { state: "error" } },
    ]);
    assert.deepEqual(
      queued.map((item) => item.id),
      [1, 3],
    );
  });

  it("keeps a dated episode from the past through the next year", () => {
    assert.equal(confirmedThisYear(null, "2026-11-22"), false);
    assert.equal(confirmedThisYear("2026-11-20", "2026-11-22"), true);
    assert.equal(confirmedThisYear("2027-11-22", "2026-11-22"), true);
    assert.equal(confirmedThisYear("2027-11-23", "2026-11-22"), false);
    const due = showsAiringThisYear(
      [
        { id: 1, next: { state: "ready", episode: { airDate: "2026-12-03" } } },
        { id: 2, next: { state: "ready", episode: { airDate: null } } },
        { id: 3, next: { state: "ready", episode: { airDate: "2028-01-01" } } },
        { id: 4, next: { state: "caught_up" } },
      ],
      "2026-11-22",
    );
    assert.deepEqual(
      due.map((item) => item.id),
      [1],
    );
  });
});
