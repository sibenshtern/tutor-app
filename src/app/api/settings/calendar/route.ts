import { parseJson, route } from "@/lib/api";
import { updateCalendarSettings } from "@/server/settings";
import { calendarSettingsInput } from "@/validation/settings";

export const PATCH = route(async (req) => Response.json(await updateCalendarSettings(await parseJson(req, calendarSettingsInput))));
