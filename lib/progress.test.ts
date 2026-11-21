import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  episodeKey,
  episodesUpTo,
  isSeasonComplete,
  nextEpisode,
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

  it("marks only the special that was tapped", () => {
    assert.deepEqual(
      episodesUpTo(catalog, { seasonNumber: 0, episodeNumber: 1 }),
      [{ seasonNumber: 0, episodeNumber: 1 }],
    );
  });
});
