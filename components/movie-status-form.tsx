import { readCsrfToken } from "@/components/csrf-field";
import { MovieStatusControls } from "@/components/movie-status-controls";
import { isoDateUTC } from "@/lib/calendar";
import type { MovieStatus } from "@/lib/library/database";

export async function MovieStatusForm({
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
  const csrf = await readCsrfToken();
  return (
    <MovieStatusControls
      csrf={csrf}
      movieId={movieId}
      status={status}
      watchedOn={watchedOn}
      rating={rating}
      today={isoDateUTC(new Date())}
      nextPath={nextPath}
    />
  );
}
