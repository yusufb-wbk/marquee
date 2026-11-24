import { YourRatingChip } from "@/components/your-rating-chip";
import { readCsrfToken } from "@/components/csrf-field";
import { getExternalRatings } from "@/lib/mdblist";
import { RATING_LABELS, scoreColor, scoreWord, tmdbRating, type ExternalRating } from "@/lib/ratings";
import { ScoreRing } from "@/components/score-ring";
import { getTitleExtras } from "@/lib/tmdb/client";

/** Scores from other sites under the title card. Falls back to TMDB's score without an MDBList key. */
export async function RatingsStrip({
  kind,
  id,
  yours,
}: {
  kind: "movie" | "tv";
  id: number;
  /** Your own rating (stored 1–20) and whether the title is in your list. Omit to hide the chip. */
  yours?: { stored: number | null; tracked: boolean };
}) {
  const [external, extras, csrf] = await Promise.all([
    getExternalRatings(kind, id),
    getTitleExtras(kind, id),
    yours ? readCsrfToken() : Promise.resolve(""),
  ]);
  const fallback = extras.ok ? tmdbRating(extras.data.tmdbScore, extras.data.tmdbVotes) : [];
  const ratings = external && external.ratings.length > 0 ? external.ratings : fallback;
  const combined = external?.score ?? null;
  if (ratings.length === 0 && combined === null && !yours) {
    return null;
  }

  return (
    <ul aria-label="Ratings" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {yours ? (
        <li className="shrink-0">
          <YourRatingChip csrf={csrf} kind={kind} id={id} stored={yours.stored} tracked={yours.tracked} />
        </li>
      ) : null}
      {combined !== null ? (
        <li className="shrink-0">
          <CombinedChip score={combined} />
        </li>
      ) : null}
      {ratings.map((rating) => (
        <li key={rating.source} className="shrink-0">
          <RatingChip rating={rating} />
        </li>
      ))}
    </ul>
  );
}

function RatingChip({ rating }: { rating: ExternalRating }) {
  const body = (
    <>
      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
        {RATING_LABELS[rating.source]}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="font-display text-2xl leading-none tabular-nums">{rating.display}</span>
        {rating.votes !== null && rating.votes > 0 ? (
          <span className="text-xs tabular-nums text-muted">{compactVotes(rating.votes)}</span>
        ) : null}
      </span>
      <span aria-hidden="true" className="h-1 rounded-full bg-line">
        <span
          className="block h-full rounded-full"
          style={{ width: `${rating.score}%`, background: scoreColor(rating.score) }}
        />
      </span>
    </>
  );
  const className = "grid min-w-28 gap-1.5 rounded-2xl border border-line bg-card px-3 py-2.5";
  return rating.url ? (
    <a href={rating.url} target="_blank" rel="noopener noreferrer" className={`${className} hover:border-accent/60`}>
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** One overall number across every site, so the strip has a headline. */
function CombinedChip({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <div
      className="flex h-full min-w-36 items-center gap-3 rounded-2xl border bg-card px-3 py-2.5"
      style={{ borderColor: `color-mix(in srgb, ${color} 60%, transparent)` }}
      title="Combined score across the sites listed, from MDBList"
    >
      <ScoreRing score={score} size="lg" />
      <span className="grid gap-0.5">
        <span className="font-display text-2xl leading-none tabular-nums" style={{ color }}>
          {Math.round(score)}
        </span>
        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
          {scoreWord(score)}
        </span>
      </span>
    </div>
  );
}

function compactVotes(votes: number): string {
  if (votes >= 1_000_000) {
    return `${(votes / 1_000_000).toFixed(1)}M`;
  }
  if (votes >= 1000) {
    return `${Math.round(votes / 1000)}K`;
  }
  return String(votes);
}

export function RatingsStripSkeleton() {
  return (
    <div className="flex gap-2" aria-hidden="true">
      {[0, 1, 2].map((key) => (
        <div key={key} className="h-[4.5rem] w-28 animate-pulse rounded-2xl bg-card" />
      ))}
    </div>
  );
}
