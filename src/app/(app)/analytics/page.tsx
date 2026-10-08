import Link from "next/link";
import { RevenueChart } from "@/components/revenue-chart";
import { Stat } from "@/components/ui";
import { formatAttendance } from "@/domain/analytics";
import { requirePageSession } from "@/lib/auth-guard";
import { formatRub } from "@/lib/money";
import { bucketLabel, type Period } from "@/lib/time";
import { getRevenue, getStudentBreakdown } from "@/server/analytics";

const PERIODS: { value: Period; label: string }[] = [
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "year", label: "Год" },
];

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requirePageSession();
  const { period: raw } = await searchParams;
  const period: Period = raw === "week" || raw === "year" ? raw : "month";
  const [revenue, rows] = await Promise.all([getRevenue(period, new Date()), getStudentBreakdown()]);
  const chartData = revenue.map((b) => ({ label: bucketLabel(b.key, period), earned: b.earned / 100, received: b.received / 100 }));
  const totalEarned = revenue.reduce((s, b) => s + b.earned, 0);
  const totalReceived = revenue.reduce((s, b) => s + b.received, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Аналитика</h1>
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <Link key={p.value} href={`/analytics?period=${p.value}`} aria-current={p.value === period ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm ${p.value === period ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white"}`}>
            {p.label}
          </Link>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Заработано за период" value={formatRub(totalEarned)} />
        <Stat label="Получено за период" value={formatRub(totalReceived)} />
      </div>
      <RevenueChart data={chartData} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">По ученикам</h2>
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                {["Ученик", "Проведено", "Часов", "Заработано", "Оплачено", "Долг", "Посещаемость"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2"><Link href={`/students/${r.id}`} className="text-blue-600 hover:underline">{r.name}</Link></td>
                  <td className="px-3 py-2">{r.completedVisits}</td>
                  <td className="px-3 py-2">{r.hoursTaught.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                  <td className="px-3 py-2">{formatRub(r.earnedKopecks)}</td>
                  <td className="px-3 py-2">{formatRub(r.paidKopecks)}</td>
                  <td className="px-3 py-2">{formatRub(r.owedKopecks)}</td>
                  <td className="px-3 py-2">{formatAttendance(r.attendanceRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
