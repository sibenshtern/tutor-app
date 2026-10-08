import { describe, expect, it } from "vitest";
import { occurrencesBetween, type SeriesShape } from "@/domain/recurrence";

const tuesday: SeriesShape = {
  weekday: 2, startTime: "17:00", durationMinutes: 60, startDate: "2026-10-01", endDate: null,
};
const dates = (s: SeriesShape, from: string, to: string, tz = "Europe/Moscow") =>
  occurrencesBetween(s, from, to, tz).map((o) => o.occurrenceDate);

describe("occurrencesBetween", () => {
  it("returns each matching weekday in the inclusive window", () => {
    expect(dates(tuesday, "2026-10-07", "2026-10-27")).toEqual(["2026-10-13", "2026-10-20", "2026-10-27"]);
    expect(dates(tuesday, "2026-10-06", "2026-10-13")).toEqual(["2026-10-06", "2026-10-13"]);
  });
  it("converts local start time to UTC", () => {
    const [first] = occurrencesBetween(tuesday, "2026-10-07", "2026-10-27", "Europe/Moscow");
    expect(first.scheduledAt.toISOString()).toBe("2026-10-13T14:00:00.000Z");
  });
  it("respects startDate and endDate", () => {
    expect(dates({ ...tuesday, startDate: "2026-10-15" }, "2026-10-07", "2026-10-27")).toEqual(["2026-10-20", "2026-10-27"]);
    expect(dates({ ...tuesday, endDate: "2026-10-20" }, "2026-10-07", "2026-10-27")).toEqual(["2026-10-13", "2026-10-20"]);
    expect(dates({ ...tuesday, endDate: "2026-10-05" }, "2026-10-07", "2026-10-27")).toEqual([]);
  });
  it("keeps wall-clock time across a DST change", () => {
    const sunday: SeriesShape = { ...tuesday, weekday: 7, startTime: "10:00", startDate: "2026-02-01" };
    const occ = occurrencesBetween(sunday, "2026-03-01", "2026-03-08", "America/New_York");
    expect(occ.map((o) => o.scheduledAt.toISOString())).toEqual([
      "2026-03-01T15:00:00.000Z",
      "2026-03-08T14:00:00.000Z",
    ]);
  });
});
