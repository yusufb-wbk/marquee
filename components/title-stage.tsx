import Image from "next/image";

import { CollapsibleText } from "@/components/collapsible-text";
import { Poster } from "@/components/poster";

export function TitleStage({
  kind,
  title,
  posterUrl,
  backdropUrl,
  facts,
  genres,
  overview,
}: {
  kind: string;
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  facts: string[];
  genres: string[];
  overview: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-line bg-card">
      {backdropUrl ? (
        <div className="absolute inset-0">
          <Image
            src={backdropUrl}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 72rem, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/92 to-background/55" />
        </div>
      ) : null}
      <div className="relative flex items-start gap-4 p-4 sm:gap-6 sm:p-6">
        <div className="shrink-0">
          <Poster src={posterUrl} title={title} size="large" />
        </div>
        <div className="grid min-w-0 flex-1 gap-3">
          <p className="text-xs uppercase tracking-wide text-muted">{kind}</p>
          <h1 className="font-display text-3xl tracking-tight sm:text-5xl">{title}</h1>
          {facts.length > 0 ? <p className="text-sm text-muted">{facts.join(" · ")}</p> : null}
          {genres.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <li
                  key={genre}
                  className="rounded-full border border-line bg-background/70 px-2 py-1 text-xs text-muted"
                >
                  {genre}
                </li>
              ))}
            </ul>
          ) : null}
          <CollapsibleText text={overview} className="max-w-3xl text-sm leading-6 text-muted" />
        </div>
      </div>
    </section>
  );
}
