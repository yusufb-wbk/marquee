import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addDays, buildInsights, currentStreak, longestStreak } from "./insights.ts";

const now = new Date("2026-11-22T10:00:00Z");

describe("insights", () => {
  it("counts streaks, keeping one alive that ended yesterday", () => {
    const days = new Set(["2026-11-21", "2026-11-20", "2026-11-19", "2026-11-10", "2026-11-11"]);
    assert.equal(currentStreak(days, "2026-11-22"), 3);
    assert.equal(currentStreak(days, "2026-11-23"), 0);
    assert.equal(longestStreak(days), 3);
    assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  });

  it("uses the viewer's time zone for the day", () => {
    const episodes = [{ showTmdbId: 1, runtimeMinutes: 30, watchedAt: "2026-11-21T22:30:00Z" }];
    const shows = [{ tmdbId: 1, title: "A", status: "watching", year: "2020", genres: [], rating: null }];
    const utc = buildInsights({ shows, movies: [], episodes, timeZone: "UTC", now });
    const riyadh = buildInsights({ shows, movies: [], episodes, timeZone: "Asia/Riyadh", now });
    assert.equal(utc.weekdays[5].items, 1); // Saturday in UTC
    assert.equal(riyadh.weekdays[6].items, 1); // Sunday 01:30 in Riyadh
  });

  it("builds totals, ratings, genres, quiet shows, backlog and decades", () => {
    const insights = buildInsights({
      timeZone: "UTC",
      now,
      shows: [
        { tmdbId: 1, title: "Old Show", status: "watching", year: "1999", genres: ["Drama"], rating: 18 },
        { tmdbId: 2, title: "New Show", status: "watching", year: "2024", genres: ["Drama", "Crime"], rating: 14 },
        { tmdbId: 3, title: "Later", status: "watchlist", year: "2025", genres: ["Comedy"], rating: null },
      ],
      episodes: [
        { showTmdbId: 1, runtimeMinutes: 50, watchedAt: "2026-08-01T20:00:00Z" },
        { showTmdbId: 2, runtimeMinutes: 40, watchedAt: "2026-11-21T20:00:00Z" },
        { showTmdbId: 2, runtimeMinutes: null, watchedAt: "2026-11-22T08:00:00Z" },
      ],
      movies: [
        { title: "Film", status: "watched", year: "2001", genres: ["Drama"], runtimeMinutes: 120, watchedOn: "2026-11-01", rating: 20 },
        { title: "Queue", status: "watchlist", year: "2023", genres: [], runtimeMinutes: 90, watchedOn: null, rating: null },
      ],
    });

    assert.deepEqual(insights.totals, {
      minutes: 210,
      episodes: 3,
      movies: 1,
      showsStarted: 2,
      missingRuntime: 1,
    });
    assert.equal(insights.lately.currentStreak, 2);
    assert.equal(insights.lately.last30Minutes, 160);
    assert.equal(insights.months.length, 12);
    assert.equal(insights.months[11].key, "2026-11");
    assert.equal(insights.months[11].minutes, 160);

    assert.equal(insights.ratings.count, 3);
    assert.equal(insights.ratings.average, (9 + 7 + 10) / 3);
    assert.equal(insights.ratings.buckets[9], 1);
    assert.deepEqual(insights.ratings.top.map((title) => title.title), ["Film", "Old Show", "New Show"]);
    assert.deepEqual(insights.ratings.bestGenres, [{ title: "Drama", value: 26 / 3, detail: "3 rated" }]);

    assert.equal(insights.topGenres[0].name, "Drama");
    assert.equal(insights.topGenres[0].share, 1);
    assert.equal(insights.topShows[0].title, "Old Show");
    assert.deepEqual(insights.quietShows.map((show) => show.title), ["Old Show"]);
    assert.equal(insights.backlog.movies, 1);
    assert.equal(insights.backlog.shows, 1);
    assert.equal(insights.backlog.movieMinutes, 90);
    assert.ok(insights.backlog.weeksAtPace !== null && insights.backlog.weeksAtPace > 0);
    assert.deepEqual(insights.decades, [
      { label: "1990s", count: 1 },
      { label: "2000s", count: 1 },
      { label: "2020s", count: 1 },
    ]);
  });
});
