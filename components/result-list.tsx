import Link from "next/link";

import { Poster } from "@/components/poster";
import { titleOverview } from "@/lib/overview";
import type { SearchTitle } from "@/lib/tmdb/types";

export function ResultList({ titles }: { titles: SearchTitle[] }) {
  if (titles.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-card px-4 py-6 text-muted">
        No shows or movies matched that search. Check the spelling, or try a
        shorter title.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {titles.map((title) => {
        const href =
          title.mediaType === "tv" ? `/tv/${title.id}` : `/movie/${title.id}`;
        const label = title.mediaType === "tv" ? "Show" : "Movie";
        return (
          <li key={`${title.mediaType}-${title.id}`}>
            <Link
              href={href}
              prefetch={true}
              className="flex gap-3 rounded-2xl border border-line bg-card p-3 hover:border-accent"
            >
              <Poster src={title.posterUrl} title={title.title} />
              <span className="grid min-w-0 gap-1">
                <span className="flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-xl leading-tight">
                    {title.title}
                  </span>
                  {title.year ? (
                    <span className="text-sm text-muted">{title.year}</span>
                  ) : null}
                  <span className="rounded-full border border-line px-2 py-0.5 text-xs uppercase tracking-wide text-muted">
                    {label}
                  </span>
                </span>
                <span className="line-clamp-3 text-sm leading-6 text-muted">
                  {titleOverview(title.overview)}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
