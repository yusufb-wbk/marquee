import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyWatchChange,
  episodeKey,
  episodesUpTo,
  isSeasonComplete,
  nextEpisode,
  seriesFinished,
  type EpisodeRef,
} from "./progress.ts";

const catalog: EpisodeRef[] = [
  { seasonNumber: 0, episodeNumber: 1 },
  { seasonNumber: 1, episodeNumber: 1 },
  { seasonNumber: 1, episodeNumber: 2 },
  { seasonNumber: 2, episodeNumber: 1 },
];

describe("next episode", () => {
  it("skips specials and already watched episodes", () => {
    const watched = new Set([episodeKey({ seasonNumber: 1, episodeNumber: 1 })]);
    assert.deepEqual(nextEpisode(catalog, watched), {
      seasonNumber: 1,
      episodeNumber: 2,
    });
  });

  it("is empty when every regular episode is watched", () => {
    const watched = new Set(
      catalog
        .filter((episode) => episode.seasonNumber > 0)
        .map((episode) => episodeKey(episode)),
    );
    assert.equal(nextEpisode(catalog, watched), null);
  });
});

describe("season complete", () => {
  it("requires every episode in that season", () => {
    const watched = new Set([episodeKey({ seasonNumber: 1, episodeNumber: 1 })]);
    assert.equal(isSeasonComplete(1, catalog, watched), false);
    watched.add(episodeKey({ seasonNumber: 1, episodeNumber: 2 }));
    assert.equal(isSeasonComplete(1, catalog, watched), true);
  });

  it("is not complete when the season has no episodes", () => {
    assert.equal(isSeasonComplete(9, catalog, new Set()), false);
  });
});

describe("watched up to here", () => {
  it("marks earlier regular episodes and stops at this one", () => {
    assert.deepEqual(
      episodesUpTo(catalog, { seasonNumber: 2, episodeNumber: 1 }),
      [
        { seasonNumber: 1, episodeNumber: 1 },
        { seasonNumber: 1, episodeNumber: 2 },
        { seasonNumber: 2, episodeNumber: 1 },
      ],
    );
  });

  it("unmarks a season, or a season and every later one, keeping specials", () => {
    const watched = new Set(["0:1", "1:1", "1:2", "2:1", "2:2", "3:1"]);
    const target = { seasonNumber: 2, episodeNumber: 1 };
    assert.deepEqual(
      [...applyWatchChange(watched, "unwatch_season", target, [])].sort(),
      ["0:1", "1:1", "1:2", "3:1"],
    );
    assert.deepEqual(
      [...applyWatchChange(watched, "unwatch_later", target, [])].sort(),
      ["0:1", "1:1", "1:2"],
    );
  });

  it("marks the tapped episode and the whole season in the open list", () => {
    const season = catalog.filter((episode) => episode.seasonNumber === 1);
    const watched = new Set<string>();
    assert.deepEqual(
      [...applyWatchChange(watched, "watch", season[0]!, season)].sort(),
      ["1:1"],
    );
    assert.deepEqual(
      [...applyWatchChange(watched, "season", season[0]!, season)].sort(),
      ["1:1", "1:2"],
    );
    const upTo = applyWatchChange(
      watched,
      "upto",
      { seasonNumber: 1, episodeNumber: 2 },
      season,
    );
    assert.equal(upTo.has("1:1"), true);
    assert.equal(upTo.has("1:2"), true);
    upTo.add("1:1");
    assert.equal(
      applyWatchChange(upTo, "unwatch", season[0]!, season).has("1:1"),
      false,
    );
  });

  it("treats an ended series as finished only when every regular episode is watched", () => {
    const seasons = [
      { seasonNumber: 0, episodeCount: 2 },
      { seasonNumber: 1, episodeCount: 2 },
    ];
    const watched = [
      { seasonNumber: 1, episodeNumber: 1 },
      { seasonNumber: 1, episodeNumber: 2 },
    ];
    assert.equal(seriesFinished("Ended", seasons, watched), true);
    assert.equal(seriesFinished("Canceled", seasons, watched), true);
    assert.equal(
      seriesFinished("Ended", seasons, watched.slice(0, 1)),
      false,
    );
    assert.equal(seriesFinished("Returning Series", seasons, watched), false);
    assert.equal(seriesFinished("Ended", [], watched), false);
  });

  it("marks only the special that was tapped", () => {
    assert.deepEqual(
      episodesUpTo(catalog, { seasonNumber: 0, episodeNumber: 1 }),
      [{ seasonNumber: 0, episodeNumber: 1 }],
    );
  });
});
