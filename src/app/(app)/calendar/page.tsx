import Link from "next/link";
import { CalendarSettings } from "@/components/calendar-settings";
import { CalendarVisitChip, type CalendarVisit } from "@/components/calendar-visit-chip";
import { blockPosition, gridHourRange } from "@/domain/calendar-grid";
import { monthWeeks, weekDates } from "@/domain/calendar";
import { requirePageSession } from "@/lib/auth-guard";
import { STATUS_COLORS, WEEKDAYS } from "@/lib/labels";
import { addDays, addMonths, formatLocalDate, localDateString, localTimeString, utcToLocal } from "@/lib/time";
import { getCalendarSettings } from "@/server/settings";
import { listVisits } from "@/server/visits";

type View = "week" | "month";

const PX_PER_HOUR = 64;

const dayNumber = (isoDate: string) => Number(isoDate.slice(8, 10));
const isSameMonth = (isoDate: string, refDate: string) => isoDate.slice(0, 7) === refDate.slice(0, 7);
const hhmm = (h: number) => `${String(h).padStart(2, "0")}:00`;
const localMinuteOfDay = (d: Date) => {
  const l = utcToLocal(d);
  return l.hour * 60 + l.minute;
};

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; date?: string }> }) {
  await requirePageSession();
  const { view: rawView, date: rawDate } = await searchParams;
  const view: View = rawView === "month" ? "month" : "week";
  const today = localDateString(new Date());
  const refDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : today;

  const days = view === "week" ? weekDates(refDate) : monthWeeks(refDate).flat();
  const [visits, calendarSettings] = await Promise.all([
    listVisits({ from: days[0], to: days.at(-1), order: "asc" }),
    getCalendarSettings(),
  ]);

  const byDate = new Map<string, CalendarVisit[]>();
  for (const v of visits) {
    const key = localDateString(v.scheduledAt);
    byDate.set(key, [...(byDate.get(key) ?? []), v]);
  }

  const prevDate = view === "week" ? addDays(refDate, -7) : addMonths(refDate, -1);
  const nextDate = view === "week" ? addDays(refDate, 7) : addMonths(refDate, 1);
  const title = view === "week"
    ? `${formatLocalDate(days[0])} – ${formatLocalDate(days.at(-1)!)}`
    : formatLocalDate(`${refDate.slice(0, 7)}-01`).replace(/^\d+ /, "");

  const pill = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white"}`;

  const { startHour, endHour } = gridHourRange(
    visits.map((v) => ({ localMinuteOfDay: localMinuteOfDay(v.scheduledAt), durationMinutes: v.durationMinutes })),
    calendarSettings.startHour,
    calendarSettings.endHour,
  );
  const hourLabels = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const gridHeight = (endHour - startHour) * PX_PER_HOUR;
  const nowMinuteOfDay = localMinuteOfDay(new Date());
  const nowInRange = nowMinuteOfDay >= startHour * 60 && nowMinuteOfDay <= endHour * 60;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Календарь</h1>
        <div className="flex items-center gap-2">
          {view === "week" && <CalendarSettings startHour={calendarSettings.startHour} endHour={calendarSettings.endHour} />}
          <Link href={`/calendar?view=week`} className={pill(view === "week")}>Неделя</Link>
          <Link href={`/calendar?view=month`} className={pill(view === "month")}>Месяц</Link>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Link href={`/calendar?view=${view}&date=${prevDate}`} className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50">← Пред.</Link>
          <Link href={`/calendar?view=${view}`} className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50">Сегодня</Link>
          <Link href={`/calendar?view=${view}&date=${nextDate}`} className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50">След. →</Link>
        </div>
        <span className="font-medium">{title}</span>
      </div>

      {view === "week" ? (
        <div className="overflow-auto rounded-lg border bg-white" style={{ maxHeight: "calc(100vh - 230px)" }}>
          <div className="flex" style={{ minWidth: 1050 }}>
            <div className="sticky left-0 z-30 w-14 shrink-0 bg-white">
              <div className="sticky top-0 z-10 h-14 border-b bg-white" />
              <div className="relative" style={{ height: gridHeight }}>
                {hourLabels.map((h) => (
                  <div key={h} className="absolute right-1 -translate-y-1/2 text-[11px] text-gray-400" style={{ top: (h - startHour) * PX_PER_HOUR }}>
                    {hhmm(h)}
                  </div>
                ))}
              </div>
            </div>
            {days.map((day, i) => {
              const dayVisits = byDate.get(day) ?? [];
              return (
                <div key={day} className="min-w-[140px] flex-1 border-l">
                  <div className={`sticky top-0 z-20 flex h-14 flex-col items-center justify-center border-b bg-white text-xs font-medium ${day === today ? "text-blue-600" : "text-gray-700"}`}>
                    <span>{WEEKDAYS[i]}</span>
                    <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm ${day === today ? "bg-blue-600 text-white" : "text-gray-900"}`}>
                      {dayNumber(day)}
                    </span>
                  </div>
                  <div className="relative" style={{ height: gridHeight }}>
                    {hourLabels.slice(0, -1).map((h) => (
                      <Link
                        key={h}
                        href={`/visits/new?date=${day}&time=${hhmm(h)}`}
                        className="absolute inset-x-0 block border-b border-gray-100 hover:bg-blue-50"
                        style={{ top: (h - startHour) * PX_PER_HOUR, height: PX_PER_HOUR }}
                      />
                    ))}
                    {dayVisits.map((v) => {
                      const { top, height } = blockPosition(localMinuteOfDay(v.scheduledAt), v.durationMinutes, startHour, PX_PER_HOUR);
                      return (
                        <Link
                          key={v.id}
                          href={`/visits/${v.id}/edit`}
                          className={`absolute inset-x-0.5 z-10 overflow-hidden rounded border px-1 text-[11px] leading-tight hover:opacity-80 ${STATUS_COLORS[v.status]}`}
                          style={{ top, height }}
                        >
                          {localTimeString(v.scheduledAt)} {v.student.name}
                        </Link>
                      );
                    })}
                    {day === today && nowInRange && (
                      <div className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-red-500" style={{ top: ((nowMinuteOfDay - startHour * 60) / 60) * PX_PER_HOUR }}>
                        <span className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-red-500" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => <div key={w} className="p-1 text-center text-xs font-medium text-gray-500">{w}</div>)}
          {days.map((day) => {
            const dayVisits = byDate.get(day) ?? [];
            const inMonth = isSameMonth(day, refDate);
            return (
              <div
                key={day}
                className={`min-h-20 rounded border p-1 ${inMonth ? "bg-white" : "bg-gray-50 text-gray-400"} ${day === today ? "ring-2 ring-blue-400" : ""}`}
              >
                <Link href={`/visits/new?date=${day}`} className="block text-right text-xs hover:underline">{dayNumber(day)}</Link>
                <div className="mt-1 space-y-0.5">
                  {dayVisits.slice(0, 3).map((v) => <CalendarVisitChip key={v.id} visit={v} compact />)}
                  {dayVisits.length > 3 && <div className="text-[10px] text-gray-500">+{dayVisits.length - 3} ещё</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
