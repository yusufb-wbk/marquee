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
  it("stores 0.5 to 10 in half steps as 1 to 20", () => {
    assert.equal(ratingToStored(0.5), 1);
    assert.equal(ratingToStored(1), 2);
    assert.equal(ratingToStored(1.5), 3);
    assert.equal(ratingToStored(10), 20);
    assert.equal(ratingToDisplay(1), 0.5);
    assert.equal(ratingToDisplay(14), 7);
    assert.equal(formatRating(15), "7.5");
  });

  it("rejects values outside 0.5 to 10 or off the half step", () => {
    for (const value of [0, 0.2, 1.2, 10.5, 11, Number.NaN]) {
      assert.equal(ratingToStored(value), null);
    }
    assert.deepEqual(parseRatingField("1.2"), { ok: false });
    assert.deepEqual(parseRatingField("10.5"), { ok: false });
    assert.deepEqual(parseRatingField(""), { ok: true, rating: null });
    assert.deepEqual(parseRatingField("0.5"), { ok: true, rating: 1 });
    assert.deepEqual(parseRatingField("8.5"), { ok: true, rating: 17 });
  });

  it("moves half a point per click across ten stars", () => {
    assert.equal(nextStarRating(null, 1), 0.5);
    assert.equal(nextStarRating(0.5, 1), 1);
    assert.equal(nextStarRating(1, 1), 0.5);
    assert.equal(nextStarRating(null, 10), 9.5);
    assert.equal(nextStarRating(9.5, 10), 10);
    assert.equal(nextStarRating(8, 3), 2.5);
  });
});
