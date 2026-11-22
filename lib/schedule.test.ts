import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isScheduleFresh,
  nextFromSchedule,
  parseStoredSeasons,
  seasonsToStore,
  type StoredSeason,
} from "./schedule.ts";

const seasons: StoredSeason[] = [
  { n: 1, count: 2 },
  {
    n: 2,
    count: 2,
    episodes: [
      [1, "Two one", "2024-01-01"],
      [2, "Two two", "2024-01-08"],
    ],
  },
  { n: 3, count: 1, episodes: [[1, "Three one", null]] },
];

describe("nextFromSchedule", () => {
  it("skips finished seasons and returns the first unwatched episode", () => {
    const watched = new Set(["1:1", "1:2", "2:1"]);
    assert.deepEqual(nextFromSchedule(seasons, watched), {
      state: "ready",
      episode: { seasonNumber: 2, episodeNumber: 2, name: "Two two", airDate: "2024-01-08" },
    });
  });

  it("is caught up when every saved episode is watched", () => {
    const watched = new Set(["1:1", "1:2", "2:1", "2:2", "3:1"]);
    assert.deepEqual(nextFromSchedule(seasons, watched), { state: "caught_up" });
  });

  it("misses when it needs a season that was not saved", () => {
    assert.equal(nextFromSchedule(seasons, new Set(["1:1"])), "miss");
  });
});

describe("seasonsToStore", () => {
  const show = [
    { seasonNumber: 0, episodeCount: 3 },
    { seasonNumber: 1, episodeCount: 2 },
    { seasonNumber: 2, episodeCount: 2 },
    { seasonNumber: 3, episodeCount: 0 },
  ];

  it("starts at the first unfinished season and ignores specials", () => {
    assert.deepEqual(seasonsToStore(show, new Set(["1:1", "1:2"])), [2, 3]);
  });

  it("keeps a season with no episodes yet, since episodes may be added", () => {
    assert.deepEqual(seasonsToStore(show, new Set(["1:1", "1:2", "2:1", "2:2"])), [3]);
  });
});

describe("isScheduleFresh", () => {
  const now = Date.parse("2026-11-22T12:00:00Z");

  it("keeps an airing show for 12 hours", () => {
    assert.equal(isScheduleFresh("2026-11-22T01:00:00Z", "Returning Series", now), true);
    assert.equal(isScheduleFresh("2026-11-21T23:00:00Z", "Returning Series", now), false);
  });

  it("keeps an ended show for 30 days", () => {
    assert.equal(isScheduleFresh("2026-11-01T12:00:00Z", "Ended", now), true);
    assert.equal(isScheduleFresh("2026-10-01T12:00:00Z", "Canceled", now), false);
  });
});

describe("parseStoredSeasons", () => {
  it("accepts a saved schedule", () => {
    assert.deepEqual(parseStoredSeasons(seasons), seasons);
  });

  it("rejects anything else", () => {
    assert.equal(parseStoredSeasons({}), null);
    assert.equal(parseStoredSeasons([{ n: 1 }]), null);
    assert.equal(parseStoredSeasons([{ n: 1, count: 1, episodes: [[1, 2, null]] }]), null);
  });
});
