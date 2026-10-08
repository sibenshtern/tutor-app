import { z } from "zod";
import { duration, hhmm, isoDate } from "@/validation/common";

const weekday = z.number({ invalid_type_error: "Выберите день недели" }).int().min(1, "Выберите день недели").max(7, "Выберите день недели");

export const seriesCreate = z
  .object({
    studentId: z.string().min(1),
    weekday,
    startTime: hhmm,
    durationMinutes: duration,
    startDate: isoDate,
    endDate: isoDate.nullable().optional(),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: "Дата окончания должна быть не раньше даты начала",
    path: ["endDate"],
  });

export const seriesPatch = z.object({
  weekday: weekday.optional(),
  startTime: hhmm.optional(),
  durationMinutes: duration.optional(),
  endDate: isoDate.nullable().optional(),
  active: z.boolean().optional(),
});

export type SeriesCreate = z.infer<typeof seriesCreate>;
export type SeriesPatch = z.infer<typeof seriesPatch>;
