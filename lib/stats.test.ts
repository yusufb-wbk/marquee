import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatHours, summarizeWatching } from "./stats.ts";

describe("stats", () => {
  it("sums runtimes and ranks genres from watched titles", () => {
    const stats = summarizeWatching({
      shows: [
        {
          genres: ["Drama", "Crime"],
          episodes: [{ runtimeMinutes: 47 }, { runtimeMinutes: null }],
        },
        { genres: ["Comedy"], episodes: [] },
      ],
      movies: [{ genres: ["Drama"], runtimeMinutes: 120 }],
    });

    assert.equal(stats.episodeCount, 2);
    assert.equal(stats.movieCount, 1);
    assert.equal(stats.minutes, 167);
    assert.equal(stats.episodesMissingRuntime, 1);
    assert.deepEqual(stats.topGenres, [
      { name: "Drama", count: 2 },
      { name: "Crime", count: 1 },
    ]);
    assert.equal(formatHours(167), "2.8");
  });
});
