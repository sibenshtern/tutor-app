import { z } from "zod";
import { VISIT_STATUSES } from "@/domain/visit-rules";
import { duration, hhmm, isoDate, optionalText } from "@/validation/common";

export const visitStatus = z.enum(VISIT_STATUSES);

export const visitCreate = z.object({
  studentId: z.string().min(1, "Выберите ученика"),
  date: isoDate,
  time: hhmm,
  durationMinutes: duration,
  notes: optionalText,
});

export const visitPatch = z
  .object({
    date: isoDate.optional(),
    time: hhmm.optional(),
    durationMinutes: duration.optional(),
    notes: optionalText,
    status: visitStatus.optional(),
    paid: z.boolean().optional(),
    paidAtDate: isoDate.optional(),
  })
  .refine((v) => (v.date === undefined) === (v.time === undefined), {
    message: "Изменяйте дату и время вместе",
    path: ["date"],
  });

const blankToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const visitFilter = z.object({
  studentId: z.preprocess(blankToUndefined, z.string().optional()),
  status: z.preprocess(blankToUndefined, visitStatus.optional()),
  paid: z.preprocess(blankToUndefined, z.enum(["yes", "no"]).optional()).transform((v) => (v === undefined ? undefined : v === "yes")),
  from: z.preprocess(blankToUndefined, isoDate.optional()),
  to: z.preprocess(blankToUndefined, isoDate.optional()),
});

export type VisitCreate = z.infer<typeof visitCreate>;
export type VisitPatch = z.infer<typeof visitPatch>;
export type VisitFilter = z.infer<typeof visitFilter> & { order?: "asc" | "desc" };
