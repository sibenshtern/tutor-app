import Link from "next/link";
import { Button, buttonClass, Field, Input, Select } from "@/components/ui";
import { VisitList } from "@/components/visit-list";
import { VISIT_STATUSES } from "@/domain/visit-rules";
import { requirePageSession } from "@/lib/auth-guard";
import { STATUS_LABELS } from "@/lib/labels";
import { addDays, localDateString } from "@/lib/time";
import { listStudents } from "@/server/students";
import { listVisits } from "@/server/visits";
import { visitFilter } from "@/validation/visit";

export default async function VisitsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageSession();
  const raw = await searchParams;
  const parsed = visitFilter.safeParse(raw);
  const filter = parsed.success ? parsed.data : {};
  const from = filter.from ?? addDays(localDateString(new Date()), -30);
  const [visits, students] = await Promise.all([listVisits({ ...filter, from }), listStudents({})]);
  const str = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Занятия</h1>
        <Link href="/visits/new" className={buttonClass()}>Новое занятие</Link>
      </div>
      <form className="grid gap-2 rounded-lg border bg-white p-3 sm:grid-cols-6 sm:items-end">
        <Field label="Ученик">
          <Select name="studentId" defaultValue={str("studentId")}>
            <option value="">Все</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Статус">
          <Select name="status" defaultValue={str("status")}>
            <option value="">Все</option>
            {VISIT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </Select>
        </Field>
        <Field label="Оплата">
          <Select name="paid" defaultValue={str("paid")}>
            <option value="">Все</option>
            <option value="yes">Оплачено</option>
            <option value="no">Не оплачено</option>
          </Select>
        </Field>
        <Field label="С"><Input type="date" name="from" defaultValue={from} /></Field>
        <Field label="По"><Input type="date" name="to" defaultValue={str("to")} /></Field>
        <Button type="submit" variant="secondary">Фильтр</Button>
      </form>
      <VisitList visits={visits} empty="Нет занятий по заданным фильтрам." />
    </div>
  );
}
