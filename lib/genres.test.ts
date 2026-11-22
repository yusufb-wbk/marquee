import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { genreNames } from "./tmdb/genres.ts";

describe("genre names", () => {
  it("keeps the first two known genres", () => {
    assert.deepEqual(genreNames([12, 14, 28]), ["Adventure", "Fantasy"]);
  });

  it("skips ids that are not genres", () => {
    assert.deepEqual(genreNames([999, 18]), ["Drama"]);
  });
});
