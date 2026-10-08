import { VisitForm } from "@/components/visit-form";
import { requirePageSession } from "@/lib/auth-guard";
import { localDateString } from "@/lib/time";
import { listStudents } from "@/server/students";

export default async function NewVisitPage({ searchParams }: { searchParams: Promise<{ studentId?: string; date?: string; time?: string }> }) {
  await requirePageSession();
  const { studentId, date, time } = await searchParams;
  const students = await listStudents({ active: true });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Новое занятие</h1>
      <VisitForm
        students={students.map((s) => ({ id: s.id, name: s.name }))}
        initial={{ studentId, date: date ?? localDateString(new Date()), time: time ?? "16:00", durationMinutes: 60, notes: "", paidAtDate: null }}
      />
    </div>
  );
}
