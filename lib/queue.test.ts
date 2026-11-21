import assert from "node:assert/strict";
import { describe, it } from "node:test";

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
});
