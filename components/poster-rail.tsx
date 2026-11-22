import Link from "next/link";

import { Poster } from "@/components/poster";
import { audienceScore, Score } from "@/components/score";
import type { SearchTitle } from "@/lib/tmdb/types";

export function PosterRail({
  title,
  titles,
}: {
  title: string;
  titles: SearchTitle[];
}) {
  if (titles.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-3">
      <div className="flex items-center gap-3">
        <span className="h-6 w-1 rounded-full bg-accent" aria-hidden="true" />
        <h2 className="font-display text-2xl tracking-tight">{title}</h2>
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {titles.map((item) => {
          const href = item.mediaType === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`;
          const score = audienceScore(item.rating);
          const kind = item.mediaType === "tv" ? "Show" : "Movie";
          return (
            <li key={`${item.mediaType}-${item.id}`} className="w-28 shrink-0 sm:w-36">
              <Link href={href} prefetch={true} className="grid gap-2">
                <Poster src={item.posterUrl} title={item.title} size="rail" />
                <span className="line-clamp-2 text-sm font-semibold leading-5">
                  {item.title}
                </span>
                <span className="text-xs text-muted">{item.year ?? kind}</span>
                {score ? <Score value={score} /> : null}
                {item.genres[0] ? (
                  <span className="line-clamp-1 text-xs text-muted">{item.genres[0]}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
