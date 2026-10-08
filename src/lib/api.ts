import { Prisma } from "@prisma/client";
import type { ZodType } from "zod";
import { requireSession } from "@/lib/auth-guard";
import { DomainError, HttpError, UnauthorizedError } from "@/lib/errors";
import { fieldErrors } from "@/validation/common";

function errorResponse(status: number, error: string, fields?: Record<string, string>) {
  return Response.json(fields ? { error, fields } : { error }, { status });
}

export function route<C>(handler: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      await requireSession();
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof UnauthorizedError) return errorResponse(401, "Вы не вошли в систему.");
      if (e instanceof HttpError) return errorResponse(e.status, e.message, e.fields);
      if (e instanceof DomainError) return errorResponse(409, e.message);
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") return errorResponse(404, "Не найдено.");
      console.error(e);
      return errorResponse(500, "Что-то пошло не так.");
    }
  };
}

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Тело запроса должно быть в формате JSON.");
  }
  const result = schema.safeParse(body);
  if (!result.success) throw new HttpError(400, "Исправьте отмеченные поля.", fieldErrors(result.error));
  return result.data;
}
