import Link from "next/link";
import type { VisitStatus } from "@/domain/visit-rules";
import { STATUS_COLORS } from "@/lib/labels";
import { localTimeString } from "@/lib/time";

export type CalendarVisit = {
  id: string;
  scheduledAt: Date;
  durationMinutes: number;
  status: VisitStatus;
  student: { name: string };
};

export function CalendarVisitChip({ visit, compact = false }: { visit: CalendarVisit; compact?: boolean }) {
  return (
    <Link
      href={`/visits/${visit.id}/edit`}
      className={`block truncate rounded border px-1.5 py-0.5 text-xs hover:opacity-80 ${STATUS_COLORS[visit.status]}`}
    >
      {localTimeString(visit.scheduledAt)} {visit.student.name}
      {!compact && ` · ${visit.durationMinutes} мин`}
    </Link>
  );
}
