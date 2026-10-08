import { DateTime } from "luxon";
import { APP_TZ, localToUtc } from "@/lib/time";

export interface SeriesShape {
  weekday: number;
  startTime: string;
  durationMinutes: number;
  startDate: string;
  endDate: string | null;
}

export interface Occurrence {
  occurrenceDate: string;
  scheduledAt: Date;
}

export function occurrencesBetween(series: SeriesShape, from: string, to: string, tz = APP_TZ): Occurrence[] {
  const start = series.startDate > from ? series.startDate : from;
  const end = series.endDate && series.endDate < to ? series.endDate : to;
  if (start > end) return [];

  let day = DateTime.fromISO(start, { zone: "UTC" });
  day = day.plus({ days: (series.weekday - day.weekday + 7) % 7 });
  const last = DateTime.fromISO(end, { zone: "UTC" });

  const out: Occurrence[] = [];
  while (day <= last) {
    const occurrenceDate = day.toISODate()!;
    out.push({ occurrenceDate, scheduledAt: localToUtc(occurrenceDate, series.startTime, tz) });
    day = day.plus({ weeks: 1 });
  }
  return out;
}
