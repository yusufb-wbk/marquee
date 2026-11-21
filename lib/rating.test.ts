import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatRating,
  nextStarRating,
  parseRatingField,
  ratingToDisplay,
  ratingToStored,
} from "./rating.ts";

describe("rating steps", () => {
  it("stores 1 to 10 in half steps as 2 to 20", () => {
    assert.equal(ratingToStored(1), 2);
    assert.equal(ratingToStored(1.5), 3);
    assert.equal(ratingToStored(10), 20);
    assert.equal(ratingToDisplay(14), 7);
    assert.equal(formatRating(15), "7.5");
  });

  it("rejects values outside 1 to 10 or off the half step", () => {
    for (const value of [0.5, 1.2, 10.5, 0, 11, Number.NaN]) {
      assert.equal(ratingToStored(value), null);
    }
    assert.deepEqual(parseRatingField("1.2"), { ok: false });
    assert.deepEqual(parseRatingField("10.5"), { ok: false });
    assert.deepEqual(parseRatingField(""), { ok: true, rating: null });
    assert.deepEqual(parseRatingField("8.5"), { ok: true, rating: 17 });
  });

  it("fills a star on the second click and scores it out of 10", () => {
    assert.equal(nextStarRating(null, 1), 1);
    assert.equal(nextStarRating(1, 1), 2);
    assert.equal(nextStarRating(2, 1), 1);
    assert.equal(nextStarRating(null, 5), 9);
    assert.equal(nextStarRating(9, 5), 10);
    assert.equal(nextStarRating(8, 3), 5);
  });
});
