import Link from "next/link";

import { Poster } from "@/components/poster";
import { Score } from "@/components/score";

export function TitleLink({
  href,
  title,
  posterUrl,
  meta,
  genres = [],
  rating,
}: {
  href: string;
  title: string;
  posterUrl: string | null;
  meta: string;
  genres?: string[];
  rating?: string | null;
}) {
  return (
    <Link
      href={href}
      className="flex gap-3 rounded-2xl border border-line bg-card p-3"
    >
      <Poster src={posterUrl} title={title} />
      <span className="grid min-w-0 gap-1">
        <span className="font-display text-xl leading-tight">{title}</span>
        {meta ? <span className="text-sm text-muted">{meta}</span> : null}
        {genres.length > 0 ? (
          <span className="text-sm text-muted">{genres.join(" · ")}</span>
        ) : null}
        {rating === undefined ? null : rating ? (
          <Score value={rating} />
        ) : (
          <span className="text-sm text-muted">Not rated</span>
        )}
      </span>
    </Link>
  );
}
