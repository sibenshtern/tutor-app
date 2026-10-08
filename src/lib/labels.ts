import type { VisitStatus } from "@/domain/visit-rules";

export const STATUS_LABELS: Record<VisitStatus, string> = {
  scheduled: "Запланировано",
  completed: "Проведено",
  cancelled: "Отменено",
  no_show: "Неявка",
};

export const STATUS_COLORS: Record<VisitStatus, string> = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-gray-100 text-gray-500 border-gray-300",
  no_show: "bg-red-100 text-red-800 border-red-300",
};

export const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;
