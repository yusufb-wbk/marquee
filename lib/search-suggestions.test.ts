import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseSuggestions,
  suggestionHref,
  toSuggestions,
} from "./search-suggestions.ts";
import type { SearchTitle } from "./tmdb/types.ts";

const title: SearchTitle = {
  id: 1396,
  mediaType: "tv",
  title: "Breaking Bad",
  year: "2008",
  overview: "A chemistry teacher.",
  posterUrl: null,
};

describe("search suggestions", () => {
  it("keeps the first eight titles and drops the overview", () => {
    const titles = Array.from({ length: 10 }, (_, index) => ({
      ...title,
      id: index + 1,
    }));
    const suggestions = toSuggestions(titles);
    assert.equal(suggestions.length, 8);
    assert.equal(suggestions[0]?.title, "Breaking Bad");
    assert.equal("overview" in suggestions[0], false);
    assert.equal(suggestionHref(suggestions[0]), "/tv/1");
    assert.equal(
      suggestionHref({ ...suggestions[0], id: 9, mediaType: "movie" }),
      "/movie/9",
    );
  });

  it("ignores malformed suggestion payloads", () => {
    assert.deepEqual(parseSuggestions(null), []);
    assert.deepEqual(
      parseSuggestions({
        titles: [
          { id: 4, mediaType: "movie", title: "Heat", year: "1995" },
          { id: 0, mediaType: "movie", title: "Nope", year: "1995" },
          { id: 5, mediaType: "album", title: "Nope", year: null },
        ],
      }),
      [{ id: 4, mediaType: "movie", title: "Heat", year: "1995" }],
    );
  });
});
