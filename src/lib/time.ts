import { DateTime } from "luxon";

export const APP_TZ = process.env.APP_TIMEZONE ?? "Europe/Moscow";

export type Period = "week" | "month" | "year";

export function localToUtc(date: string, time: string, tz = APP_TZ): Date {
  const dt = DateTime.fromISO(`${date}T${time}`, { zone: tz });
  if (!dt.isValid) throw new Error(`Invalid local date/time: ${date} ${time}`);
  return dt.toJSDate();
}

export function utcToLocal(d: Date, tz = APP_TZ): DateTime {
  return DateTime.fromJSDate(d, { zone: tz });
}

export function localDateString(d: Date, tz = APP_TZ): string {
  return utcToLocal(d, tz).toISODate()!;
}

export function localTimeString(d: Date, tz = APP_TZ): string {
  return utcToLocal(d, tz).toFormat("HH:mm");
}

export function localKey(l: DateTime, period: Period): string {
  if (period === "week") return l.startOf("week").toISODate()!;
  if (period === "month") return l.toFormat("yyyy-MM");
  return l.toFormat("yyyy");
}

export function bucketKey(d: Date, period: Period, tz = APP_TZ): string {
  return localKey(utcToLocal(d, tz), period);
}

export function bucketLabel(key: string, period: Period): string {
  if (period === "year") return key;
  if (period === "month") return DateTime.fromFormat(key, "yyyy-MM").setLocale("ru").toFormat("LLL yyyy");
  return DateTime.fromISO(key).setLocale("ru").toFormat("d MMM");
}

export function addDays(isoDate: string, days: number): string {
  return DateTime.fromISO(isoDate, { zone: "UTC" }).plus({ days }).toISODate()!;
}

export function addMonths(isoDate: string, months: number): string {
  return DateTime.fromISO(isoDate, { zone: "UTC" }).plus({ months }).toISODate()!;
}

export function dateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function isoFromDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatDateTime(d: Date, tz = APP_TZ): string {
  return utcToLocal(d, tz).setLocale("ru").toFormat("ccc d MMM yyyy, HH:mm");
}

export function formatLocalDate(isoDate: string): string {
  return DateTime.fromISO(isoDate, { zone: "UTC" }).setLocale("ru").toFormat("d MMM yyyy");
}
