import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildWatchedTitles, filterWatched, groupByRating, type WatchedQuery } from "./watched.ts";

const query: WatchedQuery = {
  kind: "all",
  genre: "",
  year: "",
  rating: "any",
  sort: "recent",
  text: "",
};

describe("watched list", () => {
  const titles = buildWatchedTitles({
    shows: [
      {
        tmdbId: 1,
        title: "Breaking Bad",
        year: "2008",
        posterUrl: null,
        genres: ["Crime", "Drama"],
        rating: 18,
      },
      {
        tmdbId: 2,
        title: "Queued only",
        year: "2020",
        posterUrl: null,
        genres: ["Comedy"],
        rating: null,
      },
    ],
    movies: [
      {
        tmdbId: 3,
        status: "watched",
        title: "Inception",
        year: "2010",
        posterUrl: null,
        genres: ["Action"],
        rating: 16,
        watchedOn: "2024-05-01",
      },
      {
        tmdbId: 4,
        status: "watchlist",
        title: "Later",
        year: "2014",
        posterUrl: null,
        genres: ["Drama"],
        rating: null,
        watchedOn: null,
      },
    ],
    episodes: [
      { showTmdbId: 1, watchedAt: "2024-02-01T00:00:00.000Z" },
      { showTmdbId: 1, watchedAt: "2024-06-01T00:00:00.000Z" },
    ],
  });

  it("keeps watched movies and shows with episodes", () => {
    assert.deepEqual(
      titles.map((title) => title.title),
      ["Breaking Bad", "Inception"],
    );
    assert.equal(titles[0]?.detail, "2 episodes");
    assert.equal(titles[0]?.watchedOn, "2024-06-01");
  });

  it("filters by type, genre, and rating", () => {
    const movies = filterWatched(titles, { ...query, kind: "movie" });
    assert.deepEqual(movies.map((title) => title.title), ["Inception"]);
    const crime = filterWatched(titles, { ...query, genre: "Crime", rating: "9" });
    assert.deepEqual(crime.map((title) => title.title), ["Breaking Bad"]);
    const named = filterWatched(titles, { ...query, text: "incep" });
    assert.deepEqual(named.map((title) => title.title), ["Inception"]);
  });

  it("groups a rating sort into one section per score", () => {
    const ranked = filterWatched(titles, { ...query, sort: "rating" });
    assert.deepEqual(
      groupByRating(ranked).map((group) => [group.label, group.titles.map((title) => title.title)]),
      [
        ["9/10", ["Breaking Bad"]],
        ["8/10", ["Inception"]],
      ],
    );
  });
});
