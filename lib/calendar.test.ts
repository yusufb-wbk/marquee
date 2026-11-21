import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addCalendarDays, isOnOrBetween, parseIsoDate } from "./calendar.ts";

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
});
