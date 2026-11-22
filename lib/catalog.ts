export type CatalogItem = {
  title: string;
  year: string | null;
  genres: string[];
  rating: number | null;
};

export type CatalogRating = "any" | "unrated" | "5" | "6" | "7" | "8" | "9";
export type CatalogSort = "listed" | "rating" | "title" | "year";

export type CatalogQuery = {
  genre: string;
  year: string;
  rating: CatalogRating;
  sort: CatalogSort;
  text: string;
};

export const EMPTY_CATALOG: CatalogQuery = {
  genre: "",
  year: "",
  rating: "any",
  sort: "listed",
  text: "",
};

export function isCatalogRating(value: string): value is CatalogRating {
  return (
    value === "any" ||
    value === "unrated" ||
    value === "5" ||
    value === "6" ||
    value === "7" ||
    value === "8" ||
    value === "9"
  );
}

export function isCatalogSort(value: string): value is CatalogSort {
  return value === "listed" || value === "rating" || value === "title" || value === "year";
}

export function filterCatalog<T extends CatalogItem>(
  items: readonly T[],
  query: CatalogQuery,
): T[] {
  const text = query.text.trim().toLowerCase();
  const minimum =
    query.rating === "any" || query.rating === "unrated" ? null : Number(query.rating);
  const matched = items.filter((item) => {
    if (query.genre.length > 0 && !item.genres.includes(query.genre)) {
      return false;
    }
    if (query.year.length > 0 && item.year !== query.year) {
      return false;
    }
    if (query.rating === "unrated") {
      return item.rating === null;
    }
    if (minimum !== null && (item.rating === null || item.rating < minimum)) {
      return false;
    }
    if (text.length > 0 && !item.title.toLowerCase().includes(text)) {
      return false;
    }
    return true;
  });
  if (query.sort === "listed") {
    return matched;
  }
  return matched.slice().sort((left, right) => compareCatalog(left, right, query.sort));
}

function compareCatalog(left: CatalogItem, right: CatalogItem, sort: CatalogSort): number {
  if (sort === "title") {
    return left.title.localeCompare(right.title);
  }
  if (sort === "year") {
    return (right.year ?? "").localeCompare(left.year ?? "");
  }
  if (sort === "rating") {
    return (right.rating ?? -1) - (left.rating ?? -1) || left.title.localeCompare(right.title);
  }
  return 0;
}

export function catalogGenres(items: readonly CatalogItem[]): string[] {
  return [...new Set(items.flatMap((item) => item.genres))].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function catalogYears(items: readonly CatalogItem[]): string[] {
  return [...new Set(items.flatMap((item) => (item.year ? [item.year] : [])))].sort((left, right) =>
    right.localeCompare(left),
  );
}
