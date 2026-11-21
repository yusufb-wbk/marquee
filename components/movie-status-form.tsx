import { RatingField } from "@/components/rating-field";
import { isoDateUTC } from "@/lib/calendar";
import type { MovieStatus } from "@/lib/library/database";

export function MovieStatusForm({
  movieId,
  status,
  watchedOn,
  rating,
  nextPath,
}: {
  movieId: number;
  status: MovieStatus | null;
  watchedOn: string | null;
  rating: number | null;
  nextPath: string;
}) {
  const today = isoDateUTC(new Date());

  return (
    <form action="/library/movie" method="post" className="grid gap-4">
      <input type="hidden" name="tmdbId" value={movieId} />
      <input type="hidden" name="next" value={nextPath} />
      <label className="grid gap-2 text-sm font-medium">
        Watched on
        <input
          type="date"
          name="watchedOn"
          defaultValue={watchedOn ?? today}
          className="h-12 rounded-xl border border-line bg-background px-4 text-base font-normal text-foreground"
        />
      </label>
      <RatingField stored={rating} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          name="status"
          value="watchlist"
          aria-pressed={status === "watchlist"}
          className={
            status === "watchlist"
              ? "inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink"
              : "inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold"
          }
        >
          Watchlist
        </button>
        <button
          type="submit"
          name="status"
          value="watched"
          aria-pressed={status === "watched"}
          className={
            status === "watched"
              ? "inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink"
              : "inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold"
          }
        >
          Watched
        </button>
      </div>
      {status ? (
        <button
          type="submit"
          name="status"
          value="remove"
          className="inline-flex h-12 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold"
        >
          Remove from my list
        </button>
      ) : null}
    </form>
  );
}
