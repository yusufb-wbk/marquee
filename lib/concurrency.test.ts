import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapWithLimit } from "./concurrency.ts";

describe("mapWithLimit", () => {
  it("keeps order and never runs more than the limit at once", async () => {
    let running = 0;
    let peak = 0;
    const results = await mapWithLimit([5, 1, 4, 2, 3, 0], 2, async (value) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, value * 3));
      running -= 1;
      return value * 10;
    });
    assert.deepEqual(results, [50, 10, 40, 20, 30, 0]);
    assert.equal(peak, 2);
  });

  it("handles an empty list", async () => {
    assert.deepEqual(await mapWithLimit([], 4, async () => 1), []);
  });
});
