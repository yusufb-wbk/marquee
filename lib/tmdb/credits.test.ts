import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parsePerson, parseTitleExtras } from "./credits.ts";

describe("parseTitleExtras", () => {
  it("reads movie cast, key crew, the official trailer and the IMDb id", () => {
    const extras = parseTitleExtras(
      {
        imdb_id: "tt0137523",
        credits: {
          cast: [
            { id: 819, name: "Edward Norton", character: "Narrator", profile_path: "/a.jpg" },
            { id: 0, name: "Broken" },
          ],
          crew: [
            { id: 7467, name: "David Fincher", job: "Director" },
            { id: 1, name: "Grip", job: "Key Grip" },
          ],
        },
        videos: {
          results: [
            { site: "YouTube", key: "teaser01", type: "Teaser", official: true },
            { site: "YouTube", key: "trailer1", type: "Trailer", official: true, name: "Official Trailer" },
            { site: "Vimeo", key: "vimeo001", type: "Trailer" },
          ],
        },
      },
      "movie",
    );
    assert.ok(extras);
    assert.deepEqual(extras.cast, [
      {
        id: 819,
        name: "Edward Norton",
        character: "Narrator",
        profileUrl: "https://image.tmdb.org/t/p/w185/a.jpg",
        episodes: null,
      },
    ]);
    assert.deepEqual(extras.crew, [{ id: 7467, name: "David Fincher", job: "Director" }]);
    assert.deepEqual(extras.trailer, { key: "trailer1", name: "Official Trailer" });
    assert.equal(extras.imdbId, "tt0137523");
  });

  it("reads show creators, aggregate roles with episode counts, and external ids", () => {
    const extras = parseTitleExtras(
      {
        created_by: [{ id: 66633, name: "Vince Gilligan" }],
        aggregate_credits: {
          cast: [
            {
              id: 17419,
              name: "Bryan Cranston",
              total_episode_count: 62,
              roles: [{ character: "Walter White" }, { character: "Heisenberg" }],
            },
          ],
          crew: [],
        },
        external_ids: { imdb_id: "tt0903747" },
      },
      "tv",
    );
    assert.ok(extras);
    assert.equal(extras.cast[0]?.character, "Walter White / Heisenberg");
    assert.equal(extras.cast[0]?.episodes, 62);
    assert.deepEqual(extras.crew, [{ id: 66633, name: "Vince Gilligan", job: "Creator" }]);
    assert.equal(extras.trailer, null);
    assert.equal(extras.imdbId, "tt0903747");
  });
});

describe("parsePerson", () => {
  it("merges roles on the same title and keeps movies and shows", () => {
    const person = parsePerson({
      id: 17419,
      name: "Bryan Cranston",
      known_for_department: "Acting",
      birthday: "1956-03-07",
      combined_credits: {
        cast: [
          { media_type: "tv", id: 1396, name: "Breaking Bad", character: "Walter White", first_air_date: "2008-01-20", vote_count: 15000 },
          { media_type: "movie", id: 1, title: "Drive", character: "Shannon", release_date: "2011-09-15", vote_count: 12000 },
          { media_type: "person", id: 2 },
        ],
        crew: [{ media_type: "tv", id: 1396, name: "Breaking Bad", job: "Producer" }],
      },
    });
    assert.ok(person);
    assert.equal(person.department, "Acting");
    assert.equal(person.credits.length, 2);
    const show = person.credits.find((credit) => credit.kind === "tv");
    assert.equal(show?.role, "Walter White · Producer");
    assert.equal(show?.year, "2008");
  });
});
