import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveButton } from "@/components/archive-button";
import { DeleteStudentButton } from "@/components/delete-student-button";
import { SeriesSection } from "@/components/series-section";
import { StudentForm } from "@/components/student-form";
import { buttonClass, Stat } from "@/components/ui";
import { VisitList } from "@/components/visit-list";
import { emptyStats, formatAttendance, studentBreakdown } from "@/domain/analytics";
import { requirePageSession } from "@/lib/auth-guard";
import { formatRub } from "@/lib/money";
import { phoneHref } from "@/lib/phone";
import { isoFromDateOnly, localDateString } from "@/lib/time";
import { getStudent } from "@/server/students";
import { listVisits } from "@/server/visits";

function ContactLine({ label, value }: { label: string; value: string | null }) {
  const href = phoneHref(value);
  if (!href) return null;
  return (
    <p className="text-sm">
      {label}: <a href={href} className="font-medium underline">{value}</a>
    </p>
  );
}

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageSession();
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) notFound();
  const visits = await listVisits({ studentId: id, order: "desc" });
  const stats = studentBreakdown(visits).get(id) ?? emptyStats();
  const series = student.series.map((s) => ({
    id: s.id, weekday: s.weekday, startTime: s.startTime, durationMinutes: s.durationMinutes,
    startDate: isoFromDateOnly(s.startDate), endDate: s.endDate ? isoFromDateOnly(s.endDate) : null, active: s.active,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{student.name}{!student.active && " (в архиве)"}</h1>
        <div className="flex flex-wrap gap-2">
          {student.active && <Link href={`/visits/new?studentId=${id}`} className={buttonClass("secondary")}>Добавить занятие</Link>}
          <ArchiveButton id={id} active={student.active} />
          {!student.active && <DeleteStudentButton id={id} name={student.name} />}
        </div>
      </div>
      <ContactLine label="Ученик" value={student.contact} />
      <ContactLine label="Родитель" value={student.guardianContact} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Проведено" value={String(stats.completedVisits)} />
        <Stat label="Часов" value={stats.hoursTaught.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} />
        <Stat label="Заработано" value={formatRub(stats.earnedKopecks)} />
        <Stat label="Оплачено" value={formatRub(stats.paidKopecks)} />
        <Stat label="Долг" value={formatRub(stats.owedKopecks)} />
        <Stat label="Посещаемость" value={formatAttendance(stats.attendanceRate)} />
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Профиль</h2>
        <StudentForm student={student} />
      </section>
      <SeriesSection studentId={id} series={series} today={localDateString(new Date())} canAdd={student.active} />
      <section aria-labelledby="history-heading" className="space-y-3">
        <h2 id="history-heading" className="text-lg font-semibold">История занятий</h2>
        <VisitList visits={visits} showStudent={false} empty="Пока нет занятий." />
      </section>
    </div>
  );
}
