import { notFound } from "next/navigation";
import { VisitForm } from "@/components/visit-form";
import { requirePageSession } from "@/lib/auth-guard";
import { localDateString, localTimeString } from "@/lib/time";
import { getVisit } from "@/server/visits";

export default async function EditVisitPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageSession();
  const { id } = await params;
  const visit = await getVisit(id);
  if (!visit) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Изменить занятие</h1>
      <VisitForm
        visitId={visit.id}
        studentName={visit.student.name}
        initial={{
          date: localDateString(visit.scheduledAt),
          time: localTimeString(visit.scheduledAt),
          durationMinutes: visit.durationMinutes,
          notes: visit.notes ?? "",
          paidAtDate: visit.paidAt ? localDateString(visit.paidAt) : null,
        }}
      />
    </div>
  );
}
