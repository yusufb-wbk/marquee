import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseMdblist, scoreWord, tmdbRating } from "./ratings.ts";

describe("parseMdblist", () => {
  it("formats each site its own way and keeps a fixed order", () => {
    // The shape MDBList really returns (checked against api.mdblist.com, Fight Club).
    const { score, ratings } = parseMdblist({
      score: 79,
      ids: { imdb: "tt0137523", trakt: 432, tmdb: 550 },
      ratings: [
        { source: "metacritic", value: 66, score: 66, votes: 50, url: "/fight-club" },
        { source: "imdb", value: 8.8, score: 88, votes: 2400000, url: 153 },
        { source: "tomatoes", value: 81, score: 81, url: "/m/fight_club" },
        { source: "popcorn", value: 96, score: 96 },
        { source: "letterboxd", value: 4.3, score: 86 },
        { source: "trakt", value: null, score: null },
        { source: "rogerebert", value: 2, score: 50 },
        { source: "tmdb", value: 84, score: 84 },
      ],
    }, "movie");
    assert.equal(score, 79);
    assert.deepEqual(
      ratings.map((rating) => [rating.source, rating.display]),
      [
        ["imdb", "8.8"],
        ["tomatoes", "81%"],
        ["audience", "96%"],
        ["metacritic", "66"],
        ["letterboxd", "4.3"],
        ["tmdb", "8.4"],
      ],
    );
    assert.equal(ratings[0]?.url, "https://www.imdb.com/title/tt0137523/");
    assert.equal(ratings[1]?.url, "https://www.rottentomatoes.com/m/fight_club");
    assert.equal(ratings[3]?.url, "https://www.metacritic.com/movie/fight-club");
    assert.equal(ratings[5]?.url, "https://www.themoviedb.org/movie/550");
  });

  it("works out the score when only a value is given, and ignores bad input", () => {
    assert.deepEqual(
      parseMdblist({ ratings: [{ source: "imdb", value: "7.5" }] }, "tv").ratings.map((r) => r.score),
      [75],
    );
    assert.deepEqual(parseMdblist({ error: "Invalid API key" }, "movie"), { score: null, ratings: [] });
    assert.deepEqual(parseMdblist(null, "movie"), { score: null, ratings: [] });
    assert.equal(scoreWord(86), "Very good");
  });
});

describe("tmdbRating", () => {
  it("needs a few votes before it shows", () => {
    assert.deepEqual(tmdbRating(7.4, 2), []);
    assert.equal(tmdbRating(7.4, 900)[0]?.display, "7.4");
  });
});
