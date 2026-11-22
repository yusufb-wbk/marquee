import "server-only";

import { isoDateUTC, showsEndedForNow } from "@/lib/calendar";
import type { TrackedShow } from "@/lib/library/queries";
import { nextEpisodesFor, watchedKeys } from "@/lib/library/up-next";
import { ratingToDisplay, userRatingLabel } from "@/lib/rating";

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
  userId: string,
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
  const { next } = await nextEpisodesFor(
    userId,
    watching.map((show) => ({
      tmdbId: show.tmdbId,
      watched: watchedKeys(episodesByShow.get(show.tmdbId) ?? []),
    })),
  );
  const lookedUp = watching.map((show, index) => ({ show, next: next[index]! }));

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
