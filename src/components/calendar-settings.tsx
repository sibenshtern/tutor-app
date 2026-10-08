"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, Field, Select } from "@/components/ui";
import { send } from "@/lib/client-api";
import { fieldErrors, type FieldErrors } from "@/validation/common";
import { calendarSettingsInput } from "@/validation/settings";

const START_HOURS = Array.from({ length: 24 }, (_, i) => i);
const END_HOURS = Array.from({ length: 24 }, (_, i) => i + 1);
const hourLabel = (h: number) => (h === 24 ? "24:00" : `${String(h).padStart(2, "0")}:00`);

export function CalendarSettings({ startHour, endHour }: { startHour: number; endHour: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ startHour: String(startHour), endHour: String(endHour) });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = calendarSettingsInput.safeParse({ startHour: Number(v.startHour), endHour: Number(v.endHour) });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setSaving(true);
    const res = await send("/api/settings/calendar", "PATCH", parsed.data);
    setSaving(false);
    if (!res.ok) return setErrors(res.fields);
    toast.success("Настройки календаря сохранены");
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <Button variant="secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        ⚙ Настройки
      </Button>
      {open && (
        <form
          onSubmit={onSubmit}
          className="absolute right-0 z-40 mt-2 w-64 space-y-3 rounded-lg border bg-white p-4 shadow-lg"
        >
          <p className="text-sm font-medium text-gray-700">Диапазон часов в неделе</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="С" error={errors.startHour}>
              <Select value={v.startHour} onChange={(e) => setV({ ...v, startHour: e.target.value })}>
                {START_HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </Select>
            </Field>
            <Field label="До" error={errors.endHour}>
              <Select value={v.endHour} onChange={(e) => setV({ ...v, endHour: e.target.value })}>
                {END_HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="submit" disabled={saving}>Сохранить</Button>
          </div>
        </form>
      )}
    </div>
  );
}
