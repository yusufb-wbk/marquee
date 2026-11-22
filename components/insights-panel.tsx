"use client";

import { useEffect, useState } from "react";

import { InsightsView } from "@/components/insights-view";
import type { InsightEpisode, InsightMovie, InsightShow } from "@/lib/insights";

type Loaded =
  | { state: "loading" }
  | { state: "error" }
  | { state: "ready"; shows: InsightShow[]; movies: InsightMovie[]; episodes: InsightEpisode[] };

/** Fetches Insights data the first time the tab is opened, with a skeleton until it arrives. */
export function InsightsPanel() {
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/insights", { credentials: "same-origin", headers: { accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        if (cancelled) {
          return;
        }
        const data = body as {
          ok?: boolean;
          shows?: InsightShow[];
          movies?: InsightMovie[];
          episodes?: InsightEpisode[];
        } | null;
        if (data?.ok && data.shows && data.movies && data.episodes) {
          setLoaded({ state: "ready", shows: data.shows, movies: data.movies, episodes: data.episodes });
        } else {
          setLoaded({ state: "error" });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded({ state: "error" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loaded.state === "error") {
    return <p className="text-muted">Insights could not be loaded. Try again in a moment.</p>;
  }
  if (loaded.state === "loading") {
    return <InsightsSkeleton />;
  }
  return <InsightsView shows={loaded.shows} movies={loaded.movies} episodes={loaded.episodes} />;
}

export function InsightsSkeleton() {
  return (
    <div className="grid gap-8" aria-busy="true" aria-label="Loading insights">
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-24 animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
      <div className="grid gap-3">
        <div className="h-7 w-32 animate-pulse rounded-lg bg-card" />
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-24 animate-pulse rounded-2xl bg-card" />
          ))}
        </div>
      </div>
      <div className="h-56 animate-pulse rounded-2xl bg-card" />
    </div>
  );
}
