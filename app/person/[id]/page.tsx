import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/back-button";
import { CollapsibleText } from "@/components/collapsible-text";
import { Message } from "@/components/message";
import { PageSkeleton } from "@/components/page-skeleton";
import { PersonCredits } from "@/components/person-credits";
import { formatAirDate, parsePositiveInt } from "@/lib/format";
import { loadTrackedStatuses } from "@/lib/library/queries";
import { requireUser } from "@/lib/require-user";
import { getPerson } from "@/lib/tmdb/client";
import type { Person, PersonCredit } from "@/lib/tmdb/credits";

type PersonPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Person",
};

export default function PersonPage({ params }: PersonPageProps) {
  return (
    <Suspense fallback={<PageSkeleton kind="detail" />}>
      <PersonScreen params={params} />
    </Suspense>
  );
}

async function PersonScreen({ params }: PersonPageProps) {
  const user = await requireUser();
  const id = parsePositiveInt((await params).id);
  if (id === null) {
    notFound();
  }

  const [result, statuses] = await Promise.all([getPerson(id), loadTrackedStatuses(user.id)]);
  if (!result.ok) {
    if (result.error.kind === "not_found") {
      notFound();
    }
    return (
      <Message tone="error" title="This person could not be loaded">
        {result.error.message}
      </Message>
    );
  }
  const person = result.data;

  return (
    <div className="grid gap-8">
      <BackButton />
      <PersonHeader person={person} />
      <KnownFor credits={person.credits} />
      {person.credits.length > 0 ? (
        <PersonCredits credits={person.credits} statuses={Object.fromEntries(statuses)} />
      ) : (
        <p className="text-muted">TMDB lists no movies or shows for this person yet.</p>
      )}
    </div>
  );
}

function PersonHeader({ person }: { person: Person }) {
  const born = formatAirDate(person.birthday);
  const died = formatAirDate(person.deathday);
  const age = person.birthday ? ageOn(person.birthday, person.deathday) : null;
  const facts = [
    person.department,
    born ? `Born ${born}${!died && age !== null ? ` (age ${age})` : ""}` : null,
    died ? `Died ${died}${age !== null ? ` (aged ${age})` : ""}` : null,
    person.placeOfBirth,
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <section className="flex items-start gap-4 rounded-3xl border border-line bg-card p-4 sm:gap-6 sm:p-6">
      <div className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-2xl bg-background sm:w-40">
        {person.profileUrl ? (
          <Image src={person.profileUrl} alt="" fill priority sizes="160px" className="object-cover" />
        ) : null}
      </div>
      <div className="grid min-w-0 flex-1 gap-3">
        <p className="text-xs uppercase tracking-wide text-muted">Person</p>
        <h1 className="font-display text-3xl tracking-tight sm:text-5xl">{person.name}</h1>
        {facts.length > 0 ? (
          <ul className="grid gap-0.5 text-sm text-muted">
            {facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        ) : null}
        {person.biography ? (
          <CollapsibleText text={person.biography} className="max-w-3xl text-sm leading-6 text-muted" />
        ) : null}
        {person.imdbId ? (
          <a
            href={`https://www.imdb.com/name/${person.imdbId}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit text-sm font-semibold text-accent"
          >
            IMDb profile
          </a>
        ) : null}
      </div>
    </section>
  );
}

/** Their best-known work: the most-voted titles, as posters. */
function KnownFor({ credits }: { credits: PersonCredit[] }) {
  const top = [...credits]
    .filter((credit) => credit.posterUrl)
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 10);
  if (top.length < 3) {
    return null;
  }
  return (
    <section className="grid gap-3">
      <h2 className="font-display text-2xl">Known for</h2>
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:-mx-0 sm:px-0">
        {top.map((credit) => (
          <li key={`${credit.kind}-${credit.id}`} className="w-32 shrink-0 snap-start">
            <Link href={`/${credit.kind}/${credit.id}`} className="group grid gap-2">
              <span className="relative block aspect-[2/3] overflow-hidden rounded-2xl border border-line bg-card">
                <Image
                  src={credit.posterUrl ?? ""}
                  alt=""
                  fill
                  sizes="128px"
                  className="object-cover transition-transform group-hover:scale-[1.03]"
                />
              </span>
              <span className="grid gap-0.5">
                <span className="line-clamp-2 text-sm font-semibold leading-tight">{credit.title}</span>
                <span className="text-xs text-muted">{credit.year ?? "Upcoming"}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ageOn(birthday: string, deathday: string | null): number | null {
  const born = new Date(`${birthday}T00:00:00Z`);
  const end = deathday ? new Date(`${deathday}T00:00:00Z`) : new Date();
  if (Number.isNaN(born.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  let age = end.getUTCFullYear() - born.getUTCFullYear();
  const beforeBirthday =
    end.getUTCMonth() < born.getUTCMonth() ||
    (end.getUTCMonth() === born.getUTCMonth() && end.getUTCDate() < born.getUTCDate());
  if (beforeBirthday) {
    age -= 1;
  }
  return age;
}
