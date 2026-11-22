import Image from "next/image";

import { CollapsibleText } from "@/components/collapsible-text";
import { Poster } from "@/components/poster";

export type StageBanner = {
  tone: "ended" | "live" | "cancelled" | "soon";
  label: string;
  detail: string | null;
};

const BANNER_TONE: Record<StageBanner["tone"], { strip: string; dot: string }> = {
  ended: { strip: "text-foreground", dot: "bg-muted" },
  live: { strip: "text-foreground", dot: "bg-accent" },
  cancelled: { strip: "text-danger", dot: "bg-danger" },
  soon: { strip: "text-foreground", dot: "bg-notice" },
};

export function TitleStage({
  kind,
  title,
  posterUrl,
  backdropUrl,
  facts,
  genres,
  overview,
  banner,
}: {
  banner?: StageBanner | null;
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
      {banner ? (
        <div
          className={`relative flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-line/70 bg-background/70 px-4 py-2.5 text-sm backdrop-blur-sm sm:px-6 ${BANNER_TONE[banner.tone].strip}`}
        >
          <span aria-hidden="true" className={`size-2 rounded-full ${BANNER_TONE[banner.tone].dot}`} />
          <span className="font-semibold">{banner.label}</span>
          {banner.detail ? <span className="text-muted">· {banner.detail}</span> : null}
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
