import Link from "next/link";

import { Poster } from "@/components/poster";

export function TitleLink({
  href,
  title,
  posterUrl,
  meta,
}: {
  href: string;
  title: string;
  posterUrl: string | null;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className="flex gap-3 rounded-2xl border border-line bg-card p-3"
    >
      <Poster src={posterUrl} title={title} />
      <span className="grid min-w-0 gap-1">
        <span className="font-display text-xl leading-tight">{title}</span>
        <span className="text-sm text-muted">{meta}</span>
      </span>
    </Link>
  );
}
