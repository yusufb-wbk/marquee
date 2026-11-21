/** Copy for a title that has no TMDB summary. Episodes that have not aired say so. */
export function episodeOverview(
  overview: string,
  airDate: string | null,
  today: string,
): string {
  if (overview.trim().length > 0) {
    return overview;
  }
  if (airDate !== null && airDate <= today) {
    return "N/A";
  }
  return "Not out yet";
}

export function titleOverview(overview: string): string {
  return overview.trim().length > 0 ? overview : "N/A";
}
