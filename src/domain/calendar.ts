import { DateTime } from "luxon";

export function weekDates(isoDate: string): string[] {
  const start = DateTime.fromISO(isoDate, { zone: "UTC" }).startOf("week");
  return Array.from({ length: 7 }, (_, i) => start.plus({ days: i }).toISODate()!);
}

export function monthWeeks(isoDate: string): string[][] {
  const first = DateTime.fromISO(isoDate, { zone: "UTC" }).startOf("month");
  const last = first.endOf("month");
  const gridStart = first.startOf("week");
  const gridEnd = last.endOf("week");

  const weeks: string[][] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    weeks.push(Array.from({ length: 7 }, (_, i) => cursor.plus({ days: i }).toISODate()!));
    cursor = cursor.plus({ weeks: 1 });
  }
  return weeks;
}
