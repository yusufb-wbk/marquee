import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseImdbCsv } from "./imdb-csv.ts";

describe("IMDb csv", () => {
  it("reads ratings and keeps a rating over a duplicate", () => {
    const csv = [
      "Const,Your Rating,Date Rated,Title,Title Type,Year",
      "tt0903747,9,2024-01-02,Breaking Bad,tvSeries,2008",
      'tt1375666,8,2023-05-01,"Inception, the movie",movie,2010',
      "tt0903747,,2020-01-01,Breaking Bad,tvSeries,2008",
    ].join("\n");
    const parsed = parseImdbCsv(csv);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) {
      return;
    }
    assert.equal(parsed.rows.length, 2);
    assert.deepEqual(parsed.rows[0], {
      imdbId: "tt0903747",
      title: "Breaking Bad",
      titleType: "tvSeries",
      rating: 9,
      date: "2024-01-02",
    });
    assert.equal(parsed.rows[1]?.title, "Inception, the movie");
  });

  it("reads a watchlist export that has no rating column", () => {
    const csv = "Const,Created,Title,Title Type\ntt0111161,2020-01-01,The Shawshank Redemption,movie\n";
    const parsed = parseImdbCsv(csv);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) {
      return;
    }
    assert.equal(parsed.rows[0]?.rating, null);
    assert.equal(parsed.rows[0]?.date, "2020-01-01");
  });

  it("rejects a file that is not an IMDb export", () => {
    const parsed = parseImdbCsv("name,score\nAlien,9\n");
    assert.equal(parsed.ok, false);
  });
});
