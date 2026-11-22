import "server-only";

import { isoDateUTC, showsEndedForNow } from "@/lib/calendar";
import type { TrackedShow } from "@/lib/library/queries";
import { lookupNextEpisode, watchedKeys } from "@/lib/library/up-next";
import { userRatingLabel } from "@/lib/rating";

export type EndedTitle = {
  id: number;
  href: string;
  title: string;
  posterUrl: string | null;
  meta: string;
  genres: string[];
  rating: string | null;
};

export async function loadEndedTitles(
  shows: readonly TrackedShow[],
  episodes: readonly { showTmdbId: number; seasonNumber: number; episodeNumber: number }[],
): Promise<EndedTitle[]> {
  const today = isoDateUTC(new Date());
  const watching = shows.filter((show) => show.status === "watching");
  const lookedUp = await Promise.all(
    watching.map(async (show) => {
      const keys = watchedKeys(
        episodes.filter((episode) => episode.showTmdbId === show.tmdbId),
      );
      const next = await lookupNextEpisode(show.tmdbId, keys);
      return { show, next };
    }),
  );

  return showsEndedForNow(lookedUp, today).map((item) => ({
    id: item.show.tmdbId,
    href: `/tv/${item.show.tmdbId}`,
    title: item.show.title,
    posterUrl: item.show.posterUrl,
    meta: "",
    genres: item.show.genres.slice(0, 2),
    rating: userRatingLabel(item.show.rating),
  }));
}
