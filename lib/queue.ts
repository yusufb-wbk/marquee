export function showsWithANextEpisode<T extends { next: { state: string } }>(
  items: readonly T[],
): T[] {
  return items.filter((item) => item.next.state !== "caught_up");
}
