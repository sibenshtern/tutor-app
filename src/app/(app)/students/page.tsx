import Link from "next/link";
import { Button, buttonClass, Input, Select } from "@/components/ui";
import { requirePageSession } from "@/lib/auth-guard";
import { formatRub } from "@/lib/money";
import { getStudentBreakdown } from "@/server/analytics";
import { listStudents } from "@/server/students";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; archived?: string }> }) {
  await requirePageSession();
  const { q = "", archived } = await searchParams;
  const [students, breakdown] = await Promise.all([
    listStudents({ q: q || undefined, active: archived !== "1" }),
    getStudentBreakdown(),
  ]);
  const debtById = new Map(breakdown.map((s) => [s.id, s.owedKopecks]));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ученики</h1>
        <Link href="/students/new" className={buttonClass()}>Добавить ученика</Link>
      </div>
      <form className="flex flex-col gap-2 sm:flex-row">
        <Input name="q" defaultValue={q} placeholder="Поиск по имени" aria-label="Поиск по имени" />
        <Select name="archived" defaultValue={archived ?? ""} aria-label="Показать">
          <option value="">Активные</option>
          <option value="1">В архиве</option>
        </Select>
        <Button type="submit" variant="secondary">Фильтр</Button>
      </form>
      {students.length === 0 ? (
        <p className="text-sm text-gray-500">Ученики не найдены.</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-white">
          {students.map((s) => {
            const debt = debtById.get(s.id) ?? 0;
            return (
              <li key={s.id}>
                <Link href={`/students/${s.id}`} className="flex items-center justify-between gap-2 p-3 hover:bg-gray-50">
                  <span className="font-medium">{s.name}</span>
                  <span className="flex items-center gap-2 text-sm text-gray-500">
                    {debt > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Долг {formatRub(debt)}</span>}
                    {formatRub(s.hourlyRateKopecks)}/ч
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
