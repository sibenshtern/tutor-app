import Link from "next/link";
import { Stat } from "@/components/ui";
import { VisitList } from "@/components/visit-list";
import { requirePageSession } from "@/lib/auth-guard";
import { formatRub } from "@/lib/money";
import { getDashboard, getStudentBreakdown } from "@/server/analytics";

export default async function DashboardPage() {
  await requirePageSession();
  const [d, breakdown] = await Promise.all([getDashboard(new Date()), getStudentBreakdown()]);
  const debtors = breakdown.filter((s) => s.owedKopecks > 0).sort((a, b) => b.owedKopecks - a.owedKopecks);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Главная</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Долг" value={formatRub(d.owedKopecks)} />
        <Stat label="Заработано за месяц" value={formatRub(d.month.earned)} />
        <Stat label="Получено за месяц" value={formatRub(d.month.received)} />
      </div>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Должники</h2>
        {debtors.length === 0 ? (
          <p className="text-sm text-gray-500">Нет долгов.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-white">
            {debtors.map((s) => (
              <li key={s.id}>
                <Link href={`/students/${s.id}`} className="flex items-center justify-between gap-2 p-3 hover:bg-gray-50">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-sm text-red-600">{formatRub(s.owedKopecks)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Нужно отметить</h2>
        <VisitList visits={d.needsMarking} empty="Ничего не нужно отмечать." />
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Следующие 7 дней</h2>
        <VisitList visits={d.upcoming} empty="Нет занятий в ближайшие 7 дней." />
      </section>
    </div>
  );
}
