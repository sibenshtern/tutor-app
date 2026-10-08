"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, Field, Input, Select } from "@/components/ui";
import { send } from "@/lib/client-api";
import { WEEKDAYS } from "@/lib/labels";
import { formatLocalDate } from "@/lib/time";
import { fieldErrors, type FieldErrors } from "@/validation/common";
import { seriesCreate, seriesPatch } from "@/validation/series";

export type SeriesView = {
  id: string; weekday: number; startTime: string; durationMinutes: number;
  startDate: string; endDate: string | null; active: boolean;
};

function SeriesForm({ studentId, today, series, onDone }: { studentId: string; today: string; series?: SeriesView; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = useState({
    weekday: String(series?.weekday ?? 1),
    startTime: series?.startTime ?? "16:00",
    durationMinutes: String(series?.durationMinutes ?? 60),
    startDate: series?.startDate ?? today,
    endDate: series?.endDate ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const common = { weekday: Number(v.weekday), startTime: v.startTime, durationMinutes: Number(v.durationMinutes), endDate: v.endDate || null };
    const parsed = series ? seriesPatch.safeParse(common) : seriesCreate.safeParse({ ...common, studentId, startDate: v.startDate });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setSaving(true);
    const res = await send(series ? `/api/series/${series.id}` : "/api/series", series ? "PATCH" : "POST", parsed.data);
    setSaving(false);
    if (!res.ok) return setErrors(res.fields);
    toast.success(series ? "Регулярное занятие обновлено" : "Регулярное занятие добавлено");
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border bg-white p-3 sm:grid-cols-2">
      <Field label="День недели" error={errors.weekday}>
        <Select value={v.weekday} onChange={(e) => setV({ ...v, weekday: e.target.value })}>
          {WEEKDAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
        </Select>
      </Field>
      <Field label="Время начала" error={errors.startTime}><Input type="time" value={v.startTime} onChange={(e) => setV({ ...v, startTime: e.target.value })} /></Field>
      <Field label="Продолжительность (минут)" error={errors.durationMinutes}><Input type="number" min={5} step={5} value={v.durationMinutes} onChange={(e) => setV({ ...v, durationMinutes: e.target.value })} /></Field>
      {!series && <Field label="Дата начала" error={errors.startDate}><Input type="date" value={v.startDate} onChange={(e) => setV({ ...v, startDate: e.target.value })} /></Field>}
      <Field label="Дата окончания (необязательно)" error={errors.endDate}><Input type="date" value={v.endDate} onChange={(e) => setV({ ...v, endDate: e.target.value })} /></Field>
      <p className={`text-sm sm:col-span-2 ${series ? "text-amber-700" : "text-gray-500"}`}>
        {series
          ? "Сохранение заменит все будущие запланированные занятия этого расписания, включая изменённые по отдельности."
          : "Занятия будут созданы начиная с сегодняшнего дня на 8 недель вперёд."}
      </p>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={saving}>Сохранить расписание</Button>
        <Button variant="secondary" onClick={onDone}>Отмена</Button>
      </div>
    </form>
  );
}

export function SeriesSection({ studentId, series, today, canAdd }: { studentId: string; series: SeriesView[]; today: string; canAdd: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);

  async function end(id: string) {
    if (!confirm("Завершить это регулярное занятие? Будущие запланированные занятия по нему будут удалены.")) return;
    const res = await send(`/api/series/${id}`, "PATCH", { active: false });
    if (res.ok) router.refresh();
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Регулярные занятия</h2>
        {canAdd && editing === null && <Button variant="secondary" onClick={() => setEditing("new")}>Добавить регулярное занятие</Button>}
      </div>
      {editing === "new" && <SeriesForm studentId={studentId} today={today} onDone={() => setEditing(null)} />}
      {series.length === 0 && editing === null && <p className="text-sm text-gray-500">Регулярных занятий пока нет.</p>}
      <ul className="space-y-2">
        {series.map((s) => (
          <li key={s.id} className="rounded-lg border bg-white p-3">
            {editing === s.id ? (
              <SeriesForm studentId={studentId} today={today} series={s} onDone={() => setEditing(null)} />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {WEEKDAYS[s.weekday - 1]} {s.startTime} · {s.durationMinutes} мин · с {formatLocalDate(s.startDate)}
                  {s.endDate ? ` по ${formatLocalDate(s.endDate)}` : ""}
                  {!s.active && " · завершено"}
                </span>
                {s.active && (
                  <span className="flex gap-2">
                    <Button variant="secondary" onClick={() => setEditing(s.id)}>Изменить</Button>
                    <Button variant="danger" onClick={() => end(s.id)}>Завершить</Button>
                  </span>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
