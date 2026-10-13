import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { openStatus, type Hours } from "../src/lib/hours.ts";

// Egypt is UTC+2 in January, so these dates avoid daylight saving. 2027-01-04 is a Monday.
const cairo = (day: number, hour: number, minute = 0) => Date.UTC(2027, 0, day, hour - 2, minute);
const at = (ms: number) => {
  mock.timers.reset();
  mock.timers.enable({ apis: ["Date"], now: ms });
};

describe("openStatus (Cairo time)", () => {
  afterEach(() => mock.timers.reset());

  it("treats missing or empty hours as not configured and open", () => {
    at(cairo(4, 12));
    assert.deepEqual(openStatus(null), { configured: false, open: true });
    assert.deepEqual(openStatus({}), { configured: false, open: true });
  });

  it("is open inside today's window", () => {
    at(cairo(4, 12));
    assert.equal(openStatus({ mon: { open: "10:00", close: "22:00" } }).open, true);
  });

  it("reports when it opens later today", () => {
    at(cairo(4, 9));
    assert.deepEqual(openStatus({ mon: { open: "10:00", close: "22:00" } }), { configured: true, open: false, opensDay: "mon", opensAt: "10:00", today: true });
  });

  it("is closed at closing time and reports the next open day", () => {
    at(cairo(4, 22));
    const hours: Hours = { mon: { open: "10:00", close: "22:00" }, tue: { open: "11:00", close: "22:00" } };
    assert.deepEqual(openStatus(hours), { configured: true, open: false, opensDay: "tue", opensAt: "11:00", today: false });
  });

  it("looks a week ahead when only one day has hours", () => {
    at(cairo(5, 12)); // Tuesday
    const s = openStatus({ mon: { open: "10:00", close: "22:00" } });
    assert.equal(s.open, false);
    assert.equal(s.opensDay, "mon");
  });

  it("handles hours that run past midnight", () => {
    const hours: Hours = { mon: { open: "18:00", close: "02:00" } };
    at(cairo(4, 23));
    assert.equal(openStatus(hours).open, true, "Monday 23:00 is open");
    at(cairo(5, 1));
    assert.equal(openStatus(hours).open, true, "Tuesday 01:00 is still Monday's shift");
    at(cairo(5, 3));
    assert.equal(openStatus(hours).open, false, "Tuesday 03:00 is closed");
    at(cairo(4, 17));
    assert.equal(openStatus(hours).open, false, "Monday 17:00 is before opening");
  });

  it("treats a schedule with no usable window as closed", () => {
    at(cairo(4, 12));
    assert.equal(openStatus({ zzz: { open: "10:00", close: "22:00" } } as unknown as Hours).open, false);
  });
});
