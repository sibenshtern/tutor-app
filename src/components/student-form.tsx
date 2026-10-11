"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, buttonClass, Field, Input, Textarea } from "@/components/ui";
import { send } from "@/lib/client-api";
import { parseRubles } from "@/lib/money";
import { phoneHref } from "@/lib/phone";
import { fieldErrors, type FieldErrors } from "@/validation/common";
import { studentInput } from "@/validation/student";

type StudentData = {
  id: string; name: string; contact: string | null; hourlyRateKopecks: number;
  notes: string | null; guardianName: string | null; guardianContact: string | null;
  school: string | null; schedulePreferences: string | null;
};

function CallLink({ value }: { value: string }) {
  const href = phoneHref(value);
  if (!href) return null;
  return <a href={href} className={`${buttonClass("secondary")} shrink-0`} aria-label="Позвонить">📞 Позвонить</a>;
}

export function StudentForm({ student }: { student?: StudentData }) {
  const router = useRouter();
  const [values, setValues] = useState({
    name: student?.name ?? "",
    contact: student?.contact ?? "",
    rate: student ? String(student.hourlyRateKopecks / 100).replace(".", ",") : "",
    guardianName: student?.guardianName ?? "",
    guardianContact: student?.guardianContact ?? "",
    school: student?.school ?? "",
    schedulePreferences: student?.schedulePreferences ?? "",
    notes: student?.notes ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof values) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const { rate, ...rest } = values;
    const parsed = studentInput.safeParse({ ...rest, hourlyRateKopecks: parseRubles(rate) ?? Number.NaN });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setSaving(true);
    const res = await send(student ? `/api/students/${student.id}` : "/api/students", student ? "PATCH" : "POST", parsed.data);
    setSaving(false);
    if (!res.ok) return setErrors(res.fields);
    setErrors({});
    toast.success("Сохранено");
    if (student) router.refresh();
    else router.push(`/students/${(res.data as { id: string }).id}`);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <Field label="Имя" error={errors.name}><Input value={values.name} onChange={set("name")} /></Field>
      <Field label="Ставка в час (₽)" error={errors.hourlyRateKopecks}><Input inputMode="decimal" value={values.rate} onChange={set("rate")} placeholder="1500" /></Field>
      <Field label="Контакт (телефон или email)" error={errors.contact}>
        <div className="flex gap-2"><Input value={values.contact} onChange={set("contact")} /><CallLink value={values.contact} /></div>
      </Field>
      <Field label="Школа и класс" error={errors.school}><Input value={values.school} onChange={set("school")} placeholder="Лицей 5, 9Б" /></Field>
      <Field label="Имя родителя" error={errors.guardianName}><Input value={values.guardianName} onChange={set("guardianName")} /></Field>
      <Field label="Контакт родителя" error={errors.guardianContact}>
        <div className="flex gap-2"><Input value={values.guardianContact} onChange={set("guardianContact")} /><CallLink value={values.guardianContact} /></div>
      </Field>
      <Field label="Пожелания по расписанию" error={errors.schedulePreferences}><Input value={values.schedulePreferences} onChange={set("schedulePreferences")} /></Field>
      <div className="sm:col-span-2"><Field label="Заметки" error={errors.notes}><Textarea value={values.notes} onChange={set("notes")} /></Field></div>
      <div className="sm:col-span-2"><Button type="submit" disabled={saving}>Сохранить</Button></div>
    </form>
  );
}
