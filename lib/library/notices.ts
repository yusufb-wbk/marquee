const COPY: Record<string, { title: string; body: string }> = {
  save: {
    title: "That change was not saved",
    body: "Try again in a moment.",
  },
  rating: {
    title: "That rating is not allowed",
    body: "Use 0.5 to 10 in half steps, or leave it blank.",
  },
  date: {
    title: "That watched date is not valid",
    body: "Use a real calendar date.",
  },
  note: {
    title: "That note is too long",
    body: "Keep it to 500 characters.",
  },
  missing: {
    title: "That title is not listed",
    body: "TMDB does not have the episode or movie this form asked for.",
  },
  unwatched: {
    title: "Mark the episode watched first",
    body: "A rating or note is stored on a watched episode.",
  },
  rejected: {
    title: "Reload the page and try again",
    body: "That button was from an older copy of this page.",
  },
  schema: {
    title: "Your list needs a database update",
    body: "Run supabase/schema.sql again in the Supabase SQL editor, then retry.",
  },
};

export function libraryNotice(
  code: string,
): { title: string; body: string } | null {
  return COPY[code] ?? null;
}
