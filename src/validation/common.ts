import { z, type ZodError } from "zod";

function isRealDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}

export const isoDate = z.string().refine(isRealDate, "Введите корректную дату");
export const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Введите время, например 17:30");
export const duration = z
  .number({ invalid_type_error: "Введите количество минут" })
  .int()
  .min(5, "Минимум 5 минут")
  .max(600, "Максимум 10 часов");
export const optionalText = z
  .string()
  .trim()
  .max(2000)
  .nullable()
  .optional()
  .transform((v) => (v === "" ? null : v));

export type FieldErrors = Record<string, string>;

export function fieldErrors(error: ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
