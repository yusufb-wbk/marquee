import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { filterCatalog, type CatalogItem } from "./catalog.ts";

const titles: CatalogItem[] = [
  { title: "The Odyssey", year: "2026", genres: ["Adventure"], rating: 7.8 },
  { title: "The Office", year: "2005", genres: ["Comedy"], rating: null },
  { title: "Dune", year: "2021", genres: ["Adventure", "Science Fiction"], rating: 8.2 },
];

describe("catalog filters", () => {
  it("keeps the listed order and matches genre, year, and rating", () => {
    const found = filterCatalog(titles, {
      genre: "Adventure",
      year: "",
      rating: "8",
      sort: "listed",
      text: "",
    });
    assert.deepEqual(
      found.map((title) => title.title),
      ["Dune"],
    );
  });

  it("sorts by title and can hide rated titles", () => {
    const found = filterCatalog(titles, {
      genre: "",
      year: "",
      rating: "unrated",
      sort: "title",
      text: "the",
    });
    assert.deepEqual(
      found.map((title) => title.title),
      ["The Office"],
    );
  });
});
