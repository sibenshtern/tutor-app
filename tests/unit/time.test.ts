import { describe, expect, it } from "vitest";
import {
  addDays, addMonths, bucketKey, bucketLabel, dateOnly, formatLocalDate, isoFromDateOnly,
  localDateString, localTimeString, localToUtc,
} from "@/lib/time";

const MSK = "Europe/Moscow";
const NY = "America/New_York";

describe("localToUtc", () => {
  it("interprets wall-clock time in the zone", () => {
    expect(localToUtc("2026-10-13", "17:00", MSK).toISOString()).toBe("2026-10-13T14:00:00.000Z");
  });
  it("follows DST offset changes", () => {
    expect(localToUtc("2026-03-01", "10:00", NY).toISOString()).toBe("2026-03-01T15:00:00.000Z");
    expect(localToUtc("2026-03-08", "10:00", NY).toISOString()).toBe("2026-03-08T14:00:00.000Z");
  });
  it("throws on an impossible date", () => {
    expect(() => localToUtc("2026-02-30", "10:00", MSK)).toThrow();
  });
});

describe("local views of a UTC instant", () => {
  it("uses the zone's calendar day", () => {
    const d = new Date("2026-09-30T21:30:00Z");
    expect(localDateString(d, MSK)).toBe("2026-10-01");
    expect(localTimeString(d, MSK)).toBe("00:30");
  });
});

describe("bucketKey", () => {
  const d = new Date("2026-10-07T09:00:00Z");
  it("weeks start on Monday", () => expect(bucketKey(d, "week", MSK)).toBe("2026-10-05"));
  it("months and years", () => {
    expect(bucketKey(d, "month", MSK)).toBe("2026-10");
    expect(bucketKey(d, "year", MSK)).toBe("2026");
  });
  it("buckets by local time at a month boundary", () => {
    expect(bucketKey(new Date("2026-09-30T21:30:00Z"), "month", MSK)).toBe("2026-10");
  });
});

describe("date-only helpers", () => {
  it("round-trips", () => expect(isoFromDateOnly(dateOnly("2026-10-13"))).toBe("2026-10-13"));
  it("adds days across months", () => expect(addDays("2026-10-07", 56)).toBe("2026-12-02"));
});

describe("addMonths", () => {
  it("shifts by whole months, forward and back", () => {
    expect(addMonths("2026-10-15", 1)).toBe("2026-11-15");
    expect(addMonths("2026-10-15", -1)).toBe("2026-09-15");
  });
  it("clamps to the shorter month's last day instead of overflowing", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });
});

describe("bucketLabel", () => {
  it("formats each period", () => {
    expect(bucketLabel("2026-10", "month")).toBe("окт. 2026");
    expect(bucketLabel("2026-10-05", "week")).toBe("5 окт.");
    expect(bucketLabel("2026-05-07", "week")).toBe("7 мая");
    expect(bucketLabel("2026", "year")).toBe("2026");
  });
});

describe("formatLocalDate", () => {
  it("formats an ISO date in Russian", () => {
    expect(formatLocalDate("2026-10-07")).toBe("7 окт. 2026");
    expect(formatLocalDate("2026-05-07")).toBe("7 мая 2026");
  });
});
