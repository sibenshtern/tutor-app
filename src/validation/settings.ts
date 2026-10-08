import { z } from "zod";

export const calendarSettingsInput = z
  .object({
    startHour: z.number({ invalid_type_error: "Укажите час начала" }).int().min(0).max(23),
    endHour: z.number({ invalid_type_error: "Укажите час окончания" }).int().min(1).max(24),
  })
  .refine((v) => v.startHour < v.endHour, { message: "Час начала должен быть раньше часа окончания", path: ["startHour"] });

export type CalendarSettingsInput = z.infer<typeof calendarSettingsInput>;
