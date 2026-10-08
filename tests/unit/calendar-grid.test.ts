import { describe, expect, it } from "vitest";
import { blockPosition, gridHourRange } from "@/domain/calendar-grid";

describe("gridHourRange", () => {
  it("uses the default range when every visit fits inside it", () => {
    expect(gridHourRange([{ localMinuteOfDay: 10 * 60, durationMinutes: 60 }])).toEqual({ startHour: 8, endHour: 21 });
  });
  it("widens to include a visit that starts before the default range", () => {
    expect(gridHourRange([{ localMinuteOfDay: 6 * 60 + 30, durationMinutes: 60 }])).toEqual({ startHour: 6, endHour: 21 });
  });
  it("widens to include a visit that ends after the default range", () => {
    expect(gridHourRange([{ localMinuteOfDay: 21 * 60, durationMinutes: 90 }])).toEqual({ startHour: 8, endHour: 23 });
  });
  it("returns the default range for no visits", () => {
    expect(gridHourRange([])).toEqual({ startHour: 8, endHour: 21 });
  });
});

describe("blockPosition", () => {
  it("positions a block by its offset from the grid's start hour", () => {
    expect(blockPosition(10 * 60, 60, 8, 48)).toEqual({ top: 96, height: 48 });
  });
  it("scales height by duration and px-per-hour", () => {
    expect(blockPosition(9 * 60, 30, 8, 48)).toEqual({ top: 48, height: 24 });
  });
  it("enforces a minimum height so very short visits stay clickable", () => {
    expect(blockPosition(8 * 60, 5, 8, 48)).toEqual({ top: 0, height: 20 });
  });
});
