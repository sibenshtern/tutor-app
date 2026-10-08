import { toast } from "sonner";
import type { FieldErrors } from "@/validation/common";

export type SendResult = { ok: true; data: unknown } | { ok: false; fields: FieldErrors };

export async function send(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<SendResult> {
  let res: Response;
  try {
    res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    toast.error("Нет связи с сервером. Проверьте подключение и попробуйте ещё раз.");
    return { ok: false, fields: {} };
  }
  const json = await res.json().catch(() => ({}));
  if (res.ok) return { ok: true, data: json };
  if (res.status === 401) {
    window.location.href = "/login";
    return { ok: false, fields: {} };
  }
  if (json.fields) return { ok: false, fields: json.fields };
  toast.error(json.error ?? "Что-то пошло не так.");
  return { ok: false, fields: {} };
}
