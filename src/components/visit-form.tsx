"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { send } from "@/lib/client-api";
import { fieldErrors, type FieldErrors } from "@/validation/common";
import { visitCreate, visitPatch } from "@/validation/visit";

type Initial = { studentId?: string; date: string; time: string; durationMinutes: number; notes: string; paidAtDate: string | null };

export function VisitForm({ visitId, students = [], studentName, initial }: {
  visitId?: string; students?: { id: string; name: string }[]; studentName?: string; initial: Initial;
}) {
  const router = useRouter();
  const isEdit = Boolean(visitId);
  const [v, setV] = useState({ ...initial, studentId: initial.studentId ?? "", durationMinutes: String(initial.durationMinutes), paidAtDate: initial.paidAtDate ?? "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const base = { date: v.date, time: v.time, durationMinutes: Number(v.durationMinutes), notes: v.notes };
    const parsed = isEdit
      ? visitPatch.safeParse({ ...base, ...(v.paidAtDate ? { paidAtDate: v.paidAtDate } : {}) })
      : visitCreate.safeParse({ ...base, studentId: v.studentId });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setSaving(true);
    const res = await send(isEdit ? `/api/visits/${visitId}` : "/api/visits", isEdit ? "PATCH" : "POST", parsed.data);
    setSaving(false);
    if (!res.ok) return setErrors(res.fields);
    toast.success("Занятие сохранено");
    router.push("/visits");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      {isEdit ? (
        <p className="font-medium sm:col-span-2">{studentName}</p>
      ) : (
        <div className="sm:col-span-2">
          <Field label="Ученик" error={errors.studentId}>
            <Select value={v.studentId} onChange={(e) => setV({ ...v, studentId: e.target.value })}>
              <option value="">Выберите…</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        </div>
      )}
      <Field label="Дата" error={errors.date}><Input type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} /></Field>
      <Field label="Время" error={errors.time}><Input type="time" value={v.time} onChange={(e) => setV({ ...v, time: e.target.value })} /></Field>
      <Field label="Продолжительность (минут)" error={errors.durationMinutes}><Input type="number" min={5} step={5} value={v.durationMinutes} onChange={(e) => setV({ ...v, durationMinutes: e.target.value })} /></Field>
      {isEdit && initial.paidAtDate && (
        <Field label="Дата оплаты" error={errors.paidAtDate}><Input type="date" value={v.paidAtDate} onChange={(e) => setV({ ...v, paidAtDate: e.target.value })} /></Field>
      )}
      <div className="sm:col-span-2"><Field label="Заметки" error={errors.notes}><Textarea value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field></div>
      <div className="sm:col-span-2"><Button type="submit" disabled={saving}>Сохранить занятие</Button></div>
    </form>
  );
}
