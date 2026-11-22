import Image from "next/image";
import Link from "next/link";

import { TrailerPlayer } from "@/components/trailer-player";
import type { CastMember, CrewMember } from "@/lib/tmdb/credits";
import { getTitleExtras } from "@/lib/tmdb/client";

/** Trailer, key crew and cast for a movie or show. Renders nothing if TMDB has none of these. */
export async function TitleCredits({
  kind,
  id,
  title,
}: {
  kind: "movie" | "tv";
  id: number;
  title: string;
}) {
  const extras = await getTitleExtras(kind, id);
  if (!extras.ok) {
    return null;
  }
  const { cast, crew, trailer } = extras.data;
  if (cast.length === 0 && crew.length === 0 && !trailer) {
    return null;
  }

  return (
    <div className="grid gap-8">
      {trailer ? (
        <section className="grid gap-3">
          <h2 className="font-display text-2xl">Trailer</h2>
          <div className="max-w-3xl">
            <TrailerPlayer videoKey={trailer.key} title={trailer.name || `${title} trailer`} />
          </div>
        </section>
      ) : null}
      {crew.length > 0 ? <CrewLine crew={crew} /> : null}
      {cast.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="font-display text-2xl">Cast</h2>
          <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:-mx-0 sm:px-0">
            {cast.map((member) => (
              <li key={member.id} className="w-28 shrink-0 snap-start">
                <CastCard member={member} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function CastCard({ member }: { member: CastMember }) {
  return (
    <Link href={`/person/${member.id}`} className="group grid gap-2">
      <span className="relative block aspect-[2/3] overflow-hidden rounded-2xl border border-line bg-card">
        {member.profileUrl ? (
          <Image
            src={member.profileUrl}
            alt=""
            fill
            sizes="112px"
            className="object-cover transition-transform group-hover:scale-[1.03]"
          />
        ) : (
          <span className="grid h-full place-items-center font-display text-3xl text-muted">
            {initials(member.name)}
          </span>
        )}
      </span>
      <span className="grid gap-0.5">
        <span className="line-clamp-2 text-sm font-semibold leading-tight">{member.name}</span>
        {member.character ? (
          <span className="line-clamp-2 text-xs leading-snug text-muted">{member.character}</span>
        ) : null}
        {member.episodes ? (
          <span className="text-xs tabular-nums text-muted">
            {member.episodes === 1 ? "1 episode" : `${member.episodes} episodes`}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function CrewLine({ crew }: { crew: CrewMember[] }) {
  // Group by job: "Directed by A, B".
  const byJob = new Map<string, CrewMember[]>();
  for (const member of crew) {
    byJob.set(member.job, [...(byJob.get(member.job) ?? []), member]);
  }
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {[...byJob.entries()].map(([job, members]) => (
        <div key={job} className="grid gap-1">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{jobLabel(job)}</dt>
          <dd className="flex flex-wrap gap-x-3 gap-y-1">
            {members.map((member) => (
              <Link key={member.id} href={`/person/${member.id}`} className="font-medium hover:text-accent">
                {member.name}
              </Link>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function jobLabel(job: string): string {
  const labels: Record<string, string> = {
    Creator: "Created by",
    Director: "Directed by",
    Screenplay: "Screenplay",
    Writer: "Written by",
    Novel: "Based on the novel by",
    "Original Music Composer": "Music by",
  };
  return labels[job] ?? job;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function TitleCreditsSkeleton() {
  return (
    <div className="grid gap-3" aria-hidden="true">
      <div className="h-7 w-24 animate-pulse rounded-lg bg-card" />
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2, 3, 4].map((key) => (
          <div key={key} className="aspect-[2/3] w-28 shrink-0 animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
    </div>
  );
}
