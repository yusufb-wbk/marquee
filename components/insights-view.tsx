"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import {
  buildInsights,
  type InsightEpisode,
  type InsightMovie,
  type InsightShow,
  type Insights,
} from "@/lib/insights";
import { formatHours } from "@/lib/stats";

type ClientEnv = { timeZone: string; now: Date };

let cachedEnv: ClientEnv | null = null;

/** Time zone and "now" from the viewer's device. Stable for an hour so the snapshot does not churn. */
function readClientEnv(): ClientEnv {
  if (!cachedEnv || Date.now() - cachedEnv.now.getTime() > 60 * 60 * 1000) {
    cachedEnv = {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      now: new Date(),
    };
  }
  return cachedEnv;
}

function subscribe(): () => void {
  return () => {};
}

export function InsightsView({
  shows,
  movies,
  episodes,
}: {
  shows: InsightShow[];
  movies: InsightMovie[];
  episodes: InsightEpisode[];
}) {
  const env = useSyncExternalStore(subscribe, readClientEnv, () => null);
  const insights = useMemo(
    () => (env ? buildInsights({ shows, movies, episodes, ...env }) : null),
    [env, shows, movies, episodes],
  );

  if (!insights) {
    return <div className="h-96 animate-pulse rounded-2xl bg-card" aria-hidden="true" />;
  }
  if (insights.totals.episodes === 0 && insights.totals.movies === 0 && insights.ratings.count === 0) {
    return (
      <p className="text-muted">
        Insights show up after you mark an episode or a movie as watched.
      </p>
    );
  }
  return <InsightsBody insights={insights} />;
}

function InsightsBody({ insights }: { insights: Insights }) {
  const { totals, lately, ratings, backlog } = insights;
  const days = totals.minutes / 60 / 24;
  const busiest = [...insights.weekdays].sort((a, b) => b.minutes - a.minutes || b.items - a.items)[0];

  return (
    <div className="grid gap-8">
      <section className="grid gap-3" aria-label="Totals">
        <dl className="grid grid-cols-3 gap-2">
          <Tile label="Hours" value={formatHours(totals.minutes)} />
          <Tile label="Episodes" value={String(totals.episodes)} />
          <Tile label="Movies" value={String(totals.movies)} />
        </dl>
        <p className="text-sm leading-6 text-muted">
          {days >= 1
            ? `About ${days >= 10 ? Math.round(days) : days.toFixed(1)} days of screen time, `
            : "So far, "}
          across {plural(totals.showsStarted, "show")} and {plural(totals.movies, "movie")}.
          {totals.missingRuntime > 0
            ? ` ${plural(totals.missingRuntime, "title")} ${totals.missingRuntime === 1 ? "has" : "have"} no runtime on TMDB, so ${totals.missingRuntime === 1 ? "it is" : "they are"} not in the hours.`
            : ""}
        </p>
      </section>

      <Section title="Lately">
        <dl className="grid grid-cols-2 gap-2">
          <Tile
            label="Last 30 days"
            value={`${formatHours(lately.last30Minutes)} h`}
            note={trend(lately.last30Minutes, lately.previous30Minutes)}
          />
          <Tile
            label="Current streak"
            value={plural(lately.currentStreak, "day")}
            note={lately.currentStreak > 0 ? "Watch something today to keep it going." : "Watch something to start one."}
          />
          <Tile label="Longest streak" value={plural(lately.longestStreak, "day")} />
          <Tile label="Days with a watch" value={String(lately.activeDays)} />
        </dl>
      </Section>

      <Section
        title="Last 12 months"
        lead="Hours watched each month. Tap a bar for details."
      >
        <BarChart
          label="Hours watched per month"
          bars={insights.months.map((month) => ({
            key: month.key,
            short: month.label.slice(0, 1),
            value: month.minutes,
            detail: `${month.label} ${month.key.slice(0, 4)}: ${formatHours(month.minutes)} h, ${plural(month.items, "watch", "watches")}`,
          }))}
        />
      </Section>

      <Section
        title="When you watch"
        lead={busiest && busiest.items > 0 ? `${fullWeekday(busiest.label)} is your biggest day.` : undefined}
      >
        <BarChart
          label="Hours watched per weekday"
          bars={insights.weekdays.map((day) => ({
            key: day.label,
            short: day.label,
            value: day.minutes,
            detail: `${fullWeekday(day.label)}: ${formatHours(day.minutes)} h, ${plural(day.items, "watch", "watches")}`,
          }))}
        />
      </Section>

      <Section
        title="Your ratings"
        lead={
          ratings.average !== null
            ? `You rate titles ${ratings.average.toFixed(1)} out of 10 on average, over ${plural(ratings.count, "rating")}.`
            : "Rate shows and movies to see how you score them."
        }
      >
        {ratings.count > 0 ? (
          <>
            <BarChart
              label="How many titles got each rating"
              bars={ratings.buckets.map((count, index) => ({
                key: String(index + 1),
                short: String(index + 1),
                value: count,
                detail: `Rated ${index === 0 ? "up to 1" : `${index + 0.5}–${index + 1}`}: ${plural(count, "title")}`,
              }))}
              format={(value) => String(value)}
            />
            <RankedList
              title="Your highest rated"
              items={ratings.top.map((item) => ({ ...item, shown: `${formatScore(item.value)}/10` }))}
            />
            {ratings.bestGenres.length > 0 ? (
              <RankedList
                title="Genres you rate highest"
                items={ratings.bestGenres.map((item) => ({ ...item, shown: `${item.value.toFixed(1)}/10` }))}
              />
            ) : null}
          </>
        ) : null}
      </Section>

      <Section title="Top genres" lead="Share of the shows and movies you have watched.">
        {insights.topGenres.length === 0 ? (
          <p className="text-muted">Genres show up after you watch an episode or a movie.</p>
        ) : (
          <ShareList
            items={insights.topGenres.map((genre) => ({
              key: genre.name,
              label: genre.name,
              share: genre.share,
              value: `${genre.count} · ${Math.round(genre.share * 100)}%`,
            }))}
          />
        )}
      </Section>

      {insights.topShows.length > 0 ? (
        <Section title="Most watched shows">
          <RankedList
            items={insights.topShows.map((show) => ({
              ...show,
              shown: show.value > 0 ? `${formatHours(show.value)} h` : "",
            }))}
          />
        </Section>
      ) : null}

      {insights.quietShows.length > 0 ? (
        <Section
          title="Gone quiet"
          lead="Shows you are watching but have not touched in a while. Pick one back up, or mark it stopped."
        >
          <ul className="grid gap-2">
            {insights.quietShows.map((show) => (
              <li key={show.tmdbId}>
                <Link
                  href={`/tv/${show.tmdbId}`}
                  className="flex items-baseline justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3"
                >
                  <span className="font-medium">{show.title}</span>
                  <span className="shrink-0 text-sm tabular-nums text-muted">
                    {show.daysAgo >= 60 ? `${Math.round(show.daysAgo / 30)} months` : `${show.daysAgo} days`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {backlog.movies + backlog.shows > 0 ? (
        <Section title="Watchlist backlog">
          <dl className="grid grid-cols-3 gap-2">
            <Tile label="Movies" value={String(backlog.movies)} />
            <Tile label="Movie hours" value={formatHours(backlog.movieMinutes)} />
            <Tile label="Shows" value={String(backlog.shows)} />
          </dl>
          <p className="text-sm leading-6 text-muted">
            {backlog.weeksAtPace !== null
              ? `At your pace over the last 90 days, the movies alone would take about ${paceText(backlog.weeksAtPace)}.`
              : "Watch a few things to see how long your watchlist would take at your pace."}
          </p>
        </Section>
      ) : null}

      {insights.decades.length > 0 ? (
        <Section title="By decade" lead="When the shows and movies you have watched came out.">
          <ShareList
            items={insights.decades.map((decade) => {
              const max = Math.max(...insights.decades.map((item) => item.count));
              return {
                key: decade.label,
                label: decade.label,
                share: max > 0 ? decade.count / max : 0,
                value: String(decade.count),
              };
            })}
          />
        </Section>
      ) : null}
    </div>
  );
}

function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <header className="grid gap-1">
        <h2 className="font-display text-2xl">{title}</h2>
        {lead ? <p className="text-sm leading-6 text-muted">{lead}</p> : null}
      </header>
      {children}
    </section>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="grid content-start gap-1 rounded-2xl border border-line bg-card px-3 py-4">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="font-display text-3xl tabular-nums">{value}</dd>
      {note ? <dd className="text-xs leading-5 text-muted">{note}</dd> : null}
    </div>
  );
}

type Bar = { key: string; short: string; value: number; detail: string };

/** Single-series column chart. One hue, rounded tops on the baseline, tap or hover for the value. */
function BarChart({
  label,
  bars,
  format = (minutes) => `${formatHours(minutes)} h`,
}: {
  label: string;
  bars: Bar[];
  format?: (value: number) => string;
}) {
  const max = Math.max(0, ...bars.map((bar) => bar.value));
  const peak = bars.findIndex((bar) => bar.value === max && max > 0);
  const [active, setActive] = useState<number | null>(null);
  const shown = active ?? (peak >= 0 ? peak : null);

  if (max === 0) {
    return <p className="text-sm text-muted">Nothing here yet.</p>;
  }

  return (
    <figure className="grid gap-2 rounded-2xl border border-line bg-card p-4">
      <figcaption className="min-h-5 text-sm tabular-nums" aria-live="polite">
        {shown !== null ? bars[shown]?.detail : ""}
      </figcaption>
      <div
        role="group"
        aria-label={label}
        className="flex h-36 items-end gap-[2px] border-b border-line"
        onMouseLeave={() => setActive(null)}
      >
        {bars.map((bar, index) => {
          const height = bar.value > 0 ? Math.max(4, (bar.value / max) * 100) : 0;
          return (
            <button
              key={bar.key}
              type="button"
              aria-label={bar.detail}
              aria-pressed={active === index}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onClick={() => setActive(index)}
              className="group relative flex h-full flex-1 items-end justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span
                className={`w-full max-w-8 rounded-t-[4px] bg-accent transition-opacity ${
                  shown === index || shown === null ? "opacity-100" : "opacity-55 group-hover:opacity-100"
                }`}
                style={{ height: `${height}%` }}
              />
              {index === peak ? (
                <span className="pointer-events-none absolute -top-0.5 -translate-y-full text-[11px] tabular-nums text-muted">
                  {format(bar.value)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="flex gap-[2px]" aria-hidden="true">
        {bars.map((bar) => (
          <span key={bar.key} className="flex-1 text-center text-[11px] text-muted">
            {bar.short}
          </span>
        ))}
      </div>
    </figure>
  );
}

function ShareList({
  items,
}: {
  items: { key: string; label: string; share: number; value: string }[];
}) {
  return (
    <ol className="grid gap-2">
      {items.map((item) => (
        <li key={item.key} className="grid gap-2 rounded-2xl border border-line bg-card px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium">{item.label}</span>
            <span className="text-sm tabular-nums text-muted">{item.value}</span>
          </div>
          <div className="h-1.5 rounded-full bg-line" aria-hidden="true">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.max(2, Math.round(item.share * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

function RankedList({
  title,
  items,
}: {
  title?: string;
  items: { title: string; detail: string; shown: string }[];
}) {
  return (
    <div className="grid gap-2">
      {title ? <h3 className="text-sm font-semibold">{title}</h3> : null}
      <ol className="grid gap-2">
        {items.map((item, index) => (
          <li
            key={`${item.title}-${index}`}
            className="flex items-baseline gap-3 rounded-2xl border border-line bg-card px-4 py-3"
          >
            <span className="w-4 shrink-0 text-sm tabular-nums text-muted">{index + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{item.title}</span>
              {item.detail ? <span className="block text-xs text-muted">{item.detail}</span> : null}
            </span>
            <span className="shrink-0 text-sm tabular-nums text-muted">{item.shown}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

function trend(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? "Up from nothing the 30 days before." : "Nothing in the 30 days before either.";
  }
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) {
    return "Same as the 30 days before.";
  }
  return `${change > 0 ? "Up" : "Down"} ${Math.abs(change)}% on the 30 days before.`;
}

function paceText(weeks: number): string {
  if (weeks < 1.5) {
    return `${Math.max(1, Math.round(weeks * 7))} days`;
  }
  if (weeks < 10) {
    return `${Math.round(weeks)} weeks`;
  }
  const months = weeks / 4.345;
  if (months < 24) {
    return `${Math.round(months)} months`;
  }
  return `${(months / 12).toFixed(1)} years`;
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

function fullWeekday(short: string): string {
  const names: Record<string, string> = {
    Mon: "Monday",
    Tue: "Tuesday",
    Wed: "Wednesday",
    Thu: "Thursday",
    Fri: "Friday",
    Sat: "Saturday",
    Sun: "Sunday",
  };
  return names[short] ?? short;
}
