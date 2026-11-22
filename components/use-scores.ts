"use client";

import { useEffect, useState } from "react";

/** Most titles per request; matches app/api/scores. */
const BATCH = 60;

/**
 * Combined MDBList scores for the titles on screen, fetched as rows appear.
 * Keys are "movie-603" or "tv-1396". A missing key is still loading; null means no score.
 */
export function useScores(keys: readonly string[]): Record<string, number | null> {
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const wanted = keys.filter((key) => !(key in scores)).join(",");

  useEffect(() => {
    if (!wanted) {
      return;
    }
    const controller = new AbortController();
    const missing = wanted.split(",");
    for (let start = 0; start < missing.length; start += BATCH) {
      const batch = missing.slice(start, start + BATCH);
      fetch(`/api/scores?ids=${batch.join(",")}`, {
        credentials: "same-origin",
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { scores?: Record<string, number | null> } | null) => {
          // Mark the whole batch as answered, so a failed request is not retried in a loop.
          const answered = Object.fromEntries(batch.map((key) => [key, payload?.scores?.[key] ?? null]));
          setScores((current) => ({ ...current, ...answered }));
        })
        .catch(() => {
          // Aborted or offline: the row just shows no score.
        });
    }
    return () => controller.abort();
  }, [wanted]);

  return scores;
}
