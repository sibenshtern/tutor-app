import { describe, expect, it } from "vitest";
import { monthWeeks, weekDates } from "@/domain/calendar";

describe("weekDates", () => {
  it("returns the Monday-start week containing the given date", () => {
    expect(weekDates("2026-10-07")).toEqual([
      "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08",
      "2026-10-09", "2026-10-10", "2026-10-11",
    ]);
  });
  it("works when given the Monday itself", () => {
    expect(weekDates("2026-10-05")[0]).toBe("2026-10-05");
  });
  it("works when given the Sunday", () => {
    const week = weekDates("2026-10-11");
    expect(week[0]).toBe("2026-10-05");
    expect(week[6]).toBe("2026-10-11");
  });
});

describe("monthWeeks", () => {
  it("needs no leading padding when the month starts on Monday, but pads the trailing week (June 2026)", () => {
    const weeks = monthWeeks("2026-06-15");
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toBe("2026-06-01");
    expect(weeks.at(-1)!.at(-1)).toBe("2026-07-05");
  });
  it("covers a month that needs leading and trailing days from adjacent months (October 2026)", () => {
    const weeks = monthWeeks("2026-10-01");
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toBe("2026-09-28");
    expect(weeks.at(-1)!.at(-1)).toBe("2026-11-01");
    for (const week of weeks) expect(week).toHaveLength(7);
  });
});
