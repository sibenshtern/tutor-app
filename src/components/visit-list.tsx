import Link from "next/link";
import type { VisitStatus } from "@/domain/visit-rules";
import { formatRub } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { VisitActions } from "@/components/visit-actions";

export type VisitRow = {
  id: string;
  scheduledAt: Date;
  durationMinutes: number;
  amountDueKopecks: number;
  status: VisitStatus;
  paid: boolean;
  student: { id: string; name: string };
};

export function VisitList({ visits, showStudent = true, empty }: { visits: VisitRow[]; showStudent?: boolean; empty: string }) {
  if (visits.length === 0) return <p className="text-sm text-gray-500">{empty}</p>;
  return (
    <ul className="divide-y rounded-lg border bg-white">
      {visits.map((v) => (
        <li key={v.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-medium">
              {formatDateTime(v.scheduledAt)}
              {showStudent && (
                <>
                  {" · "}
                  <Link href={`/students/${v.student.id}`} className="text-blue-600 hover:underline">{v.student.name}</Link>
                </>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {v.durationMinutes} мин · {formatRub(v.amountDueKopecks)} ·{" "}
              <Link href={`/visits/${v.id}/edit`} className="underline">Изменить</Link>
            </div>
          </div>
          <VisitActions id={v.id} status={v.status} paid={v.paid} />
        </li>
      ))}
    </ul>
  );
}
