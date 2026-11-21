import Link from "next/link";

import type { SeasonSummary } from "@/lib/tmdb/types";

export function SeasonNav({
  showId,
  seasons,
  activeSeason,
}: {
  showId: number;
  seasons: SeasonSummary[];
  activeSeason: number | null;
}) {
  return (
    <nav aria-label="Seasons" className="flex gap-2 overflow-x-auto pb-1">
      {seasons.map((season) => {
        const selected = season.seasonNumber === activeSeason;
        return (
          <Link
            key={season.seasonNumber}
            href={`/tv/${showId}?season=${season.seasonNumber}`}
            prefetch={true}
            aria-current={selected ? "page" : undefined}
            className={`inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium ${
              selected
                ? "border-accent bg-accent text-accent-ink"
                : "border-line bg-card text-foreground"
            }`}
          >
            {season.name}
          </Link>
        );
      })}
    </nav>
  );
}
