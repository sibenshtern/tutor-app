import { z } from "zod";
import { optionalText } from "@/validation/common";

export const studentInput = z.object({
  name: z.string().trim().min(1, "Укажите имя").max(200),
  contact: optionalText,
  notes: optionalText,
  guardianContact: optionalText,
  schedulePreferences: optionalText,
  hourlyRateKopecks: z
    .number({ invalid_type_error: "Укажите ставку, например 1500 или 1500,50" })
    .int()
    .min(0, "Ставка не может быть отрицательной")
    .max(100_000_000),
});

export const studentPatch = studentInput.partial().extend({ active: z.boolean().optional() });

export type StudentInput = z.infer<typeof studentInput>;
export type StudentPatch = z.infer<typeof studentPatch>;
