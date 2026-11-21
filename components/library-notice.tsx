import { Message } from "@/components/message";
import type { LibraryCode } from "@/lib/library/queries";

const COPY: Record<Exclude<LibraryCode, "schema">, { title: string; body: string }> = {
  save: {
    title: "That change was not saved",
    body: "Try again in a moment.",
  },
  rating: {
    title: "That rating is not allowed",
    body: "Use 1 to 10 in half steps, or leave it blank.",
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
    title: "That request was blocked",
    body: "Reload the page and try again from Marquee.",
  },
};

function isNoticeCode(
  value: string,
): value is Exclude<LibraryCode, "schema"> {
  return Object.prototype.hasOwnProperty.call(COPY, value);
}

export function LibraryNotice({ code }: { code: string }) {
  if (!isNoticeCode(code)) {
    return null;
  }
  const copy = COPY[code];
  return (
    <Message tone="error" title={copy.title}>
      {copy.body}
    </Message>
  );
}
