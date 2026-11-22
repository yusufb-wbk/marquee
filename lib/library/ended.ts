import "server-only";

import { isoDateUTC, showsEndedForNow } from "@/lib/calendar";
import { mapWithLimit } from "@/lib/concurrency";
import type { TrackedShow } from "@/lib/library/queries";
import { lookupNextEpisode, watchedKeys } from "@/lib/library/up-next";
import { ratingToDisplay, userRatingLabel } from "@/lib/rating";

const LOOKUP_CONCURRENCY = 8;

export type EndedTitle = {
  id: number;
  href: string;
  title: string;
  posterUrl: string | null;
  meta: string;
  genres: string[];
  rating: string | null;
  year: string | null;
  score: number | null;
  kind: "tv";
};

export async function loadEndedTitles(
  shows: readonly TrackedShow[],
  episodes: readonly { showTmdbId: number; seasonNumber: number; episodeNumber: number }[],
): Promise<EndedTitle[]> {
  const today = isoDateUTC(new Date());
  const watching = shows.filter((show) => show.status === "watching");
  const episodesByShow = new Map<number, typeof episodes[number][]>();
  for (const episode of episodes) {
    const list = episodesByShow.get(episode.showTmdbId) ?? [];
    list.push(episode);
    episodesByShow.set(episode.showTmdbId, list);
  }
  // A few shows at a time: a long watching list would otherwise fire hundreds of TMDB requests at once.
  const lookedUp = await mapWithLimit(watching, LOOKUP_CONCURRENCY, async (show) => {
    const keys = watchedKeys(episodesByShow.get(show.tmdbId) ?? []);
    const next = await lookupNextEpisode(show.tmdbId, keys);
    return { show, next };
  });

  return showsEndedForNow(lookedUp, today).map((item) => ({
    id: item.show.tmdbId,
    href: `/tv/${item.show.tmdbId}`,
    title: item.show.title,
    posterUrl: item.show.posterUrl,
    meta: "",
    genres: item.show.genres.slice(0, 2),
    rating: userRatingLabel(item.show.rating),
    year: item.show.year,
    score: item.show.rating === null ? null : ratingToDisplay(item.show.rating),
    kind: "tv",
  }));
}
