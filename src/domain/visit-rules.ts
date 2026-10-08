import { DomainError } from "@/lib/errors";
import { calcAmountDue } from "@/lib/money";

export const VISIT_STATUSES = ["scheduled", "completed", "cancelled", "no_show"] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export function isCharged(status: VisitStatus): boolean {
  return status === "completed";
}

export interface VisitState {
  status: VisitStatus;
  paid: boolean;
  paidAt: Date | null;
  rateKopecks: number;
}

export interface VisitChange {
  status?: VisitStatus;
  paid?: boolean;
  paidAt?: Date;
  durationMinutes?: number;
  scheduledAt?: Date;
  notes?: string | null;
}

export interface VisitUpdateData {
  status?: VisitStatus;
  paid?: boolean;
  paidAt?: Date | null;
  durationMinutes?: number;
  amountDueKopecks?: number;
  scheduledAt?: Date;
  notes?: string | null;
}

export function planVisitUpdate(current: VisitState, change: VisitChange, now: Date): VisitUpdateData {
  const status = change.status ?? current.status;
  const paid = change.paid ?? current.paid;
  if (paid && status !== "completed") {
    throw new DomainError(
      current.paid && change.status !== undefined
        ? "Сначала снимите отметку об оплате, чтобы изменить статус."
        : "Отметить оплату можно только для проведённых занятий.",
    );
  }

  const data: VisitUpdateData = {};
  if (change.status !== undefined) data.status = change.status;
  if (change.notes !== undefined) data.notes = change.notes;
  if (change.scheduledAt !== undefined) data.scheduledAt = change.scheduledAt;
  if (change.durationMinutes !== undefined) {
    data.durationMinutes = change.durationMinutes;
    data.amountDueKopecks = calcAmountDue(current.rateKopecks, change.durationMinutes);
  }
  if (change.paid !== undefined) {
    data.paid = change.paid;
    data.paidAt = change.paid ? (change.paidAt ?? (current.paid ? current.paidAt : now)) : null;
  } else if (change.paidAt !== undefined) {
    if (!current.paid) throw new DomainError("Дата оплаты есть только у оплаченных занятий.");
    data.paidAt = change.paidAt;
  }
  return data;
}
