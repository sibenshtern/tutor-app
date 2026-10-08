import { describe, expect, it } from "vitest";
import { isCharged, planVisitUpdate, type VisitState } from "@/domain/visit-rules";
import { DomainError } from "@/lib/errors";

const NOW = new Date("2026-10-07T09:00:00Z");
const base: VisitState = { status: "scheduled", paid: false, paidAt: null, rateKopecks: 300000 };
const completed: VisitState = { ...base, status: "completed" };
const paidVisit: VisitState = { ...completed, paid: true, paidAt: new Date("2026-10-01T09:00:00Z") };

describe("isCharged", () => {
  it("charges only completed visits", () => {
    expect(isCharged("completed")).toBe(true);
    expect(isCharged("scheduled")).toBe(false);
    expect(isCharged("cancelled")).toBe(false);
    expect(isCharged("no_show")).toBe(false);
  });
});

describe("planVisitUpdate", () => {
  it("marks a completed visit paid and stamps paidAt", () => {
    expect(planVisitUpdate(completed, { paid: true }, NOW)).toEqual({ paid: true, paidAt: NOW });
  });
  it("keeps the original paidAt when re-marking paid", () => {
    expect(planVisitUpdate(paidVisit, { paid: true }, NOW).paidAt).toEqual(paidVisit.paidAt);
  });
  it("refuses to mark a non-completed visit paid", () => {
    expect(() => planVisitUpdate(base, { paid: true }, NOW)).toThrow(
      new DomainError("Отметить оплату можно только для проведённых занятий."),
    );
  });
  it("refuses to move a paid visit away from completed", () => {
    expect(() => planVisitUpdate(paidVisit, { status: "cancelled" }, NOW)).toThrow(
      new DomainError("Сначала снимите отметку об оплате, чтобы изменить статус."),
    );
  });
  it("allows unmarking paid and changing status in one change", () => {
    expect(planVisitUpdate(paidVisit, { paid: false, status: "cancelled" }, NOW)).toEqual({
      status: "cancelled", paid: false, paidAt: null,
    });
  });
  it("recalculates the amount from the visit's own rate when duration changes", () => {
    expect(planVisitUpdate(base, { durationMinutes: 90 }, NOW)).toEqual({
      durationMinutes: 90, amountDueKopecks: 450000,
    });
  });
  it("edits the payment date only on paid visits", () => {
    const d = new Date("2026-10-05T09:00:00Z");
    expect(planVisitUpdate(paidVisit, { paidAt: d }, NOW)).toEqual({ paidAt: d });
    expect(() => planVisitUpdate(completed, { paidAt: d }, NOW)).toThrow(DomainError);
  });
  it("passes notes and scheduledAt through", () => {
    const at = new Date("2026-10-13T14:00:00Z");
    expect(planVisitUpdate(base, { notes: null, scheduledAt: at }, NOW)).toEqual({ notes: null, scheduledAt: at });
  });
});
