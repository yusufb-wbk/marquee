import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addCalendarDays,
  airCountdown,
  daysUntil,
  isOnOrBetween,
  parseIsoDate,
} from "./calendar.ts";

describe("calendar window", () => {
  it("keeps dates inside the next 30 days, including today", () => {
    const today = "2026-11-21";
    const end = addCalendarDays(today, 30);
    assert.equal(end, "2026-12-21");
    assert.equal(isOnOrBetween("2026-11-21", today, end ?? ""), true);
    assert.equal(isOnOrBetween("2026-12-21", today, end ?? ""), true);
    assert.equal(isOnOrBetween("2026-12-22", today, end ?? ""), false);
    assert.equal(isOnOrBetween("2026-11-20", today, end ?? ""), false);
  });

  it("rejects impossible dates", () => {
    assert.equal(parseIsoDate("2026-02-31"), null);
    assert.equal(addCalendarDays("2026-02-31", 1), null);
  });

  it("counts days until an air date", () => {
    assert.equal(daysUntil("2026-11-22", "2026-12-03"), 11);
    assert.equal(daysUntil("2026-11-22", "2026-11-22"), 0);
    assert.equal(daysUntil("2026-11-22", "2026-11-21"), -1);
    assert.equal(daysUntil("2026-02-31", "2026-03-01"), null);
    assert.equal(airCountdown("2026-11-22", "2026-12-03"), "11 days left");
    assert.equal(airCountdown("2026-11-22", "2026-11-23"), "Tomorrow");
    assert.equal(airCountdown("2026-11-22", "2026-11-22"), "Today");
    assert.equal(airCountdown("2026-11-22", "2026-11-21"), "Yesterday");
    assert.equal(airCountdown("2026-11-22", "2026-11-20"), "2 days ago");
    assert.equal(airCountdown("2026-11-22", null), null);
  });
});
