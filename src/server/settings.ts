import { prisma } from "@/lib/db";
import type { CalendarSettingsInput } from "@/validation/settings";

const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 21;

export async function getCalendarSettings() {
  const user = await prisma.user.findFirst();
  return {
    startHour: user?.calendarStartHour ?? DEFAULT_START_HOUR,
    endHour: user?.calendarEndHour ?? DEFAULT_END_HOUR,
  };
}

export async function updateCalendarSettings(patch: CalendarSettingsInput) {
  const user = await prisma.user.findFirstOrThrow();
  await prisma.user.update({
    where: { id: user.id },
    data: { calendarStartHour: patch.startHour, calendarEndHour: patch.endHour },
  });
  return patch;
}
