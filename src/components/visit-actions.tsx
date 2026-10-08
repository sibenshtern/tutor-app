"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { VISIT_STATUSES, type VisitStatus } from "@/domain/visit-rules";
import { send } from "@/lib/client-api";
import { STATUS_LABELS } from "@/lib/labels";

export function VisitActions({ id, status, paid }: { id: string; status: VisitStatus; paid: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(body: object) {
    setBusy(true);
    const res = await send(`/api/visits/${id}`, "PATCH", body);
    setBusy(false);
    if (res.ok) router.refresh();
  }

  const pill = "rounded-full border px-3 py-1 text-xs disabled:opacity-60";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {VISIT_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          disabled={busy || s === status}
          aria-pressed={s === status}
          onClick={() => patch({ status: s })}
          className={`${pill} ${s === status ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
        >
          {STATUS_LABELS[s]}
        </button>
      ))}
      {status === "completed" &&
        (paid ? (
          <button type="button" disabled={busy} onClick={() => patch({ paid: false })} className={`${pill} border-green-600 bg-green-600 text-white`}>
            Оплачено (отменить)
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={() => patch({ paid: true })} className={`${pill} border-green-600 text-green-700`}>
            Отметить оплату
          </button>
        ))}
    </div>
  );
}
