export interface GridVisit {
  localMinuteOfDay: number;
  durationMinutes: number;
}

export interface HourRange {
  startHour: number;
  endHour: number;
}

const MIN_BLOCK_HEIGHT = 20;

export function gridHourRange(visits: GridVisit[], defaultStart = 8, defaultEnd = 21): HourRange {
  let startHour = defaultStart;
  let endHour = defaultEnd;
  for (const v of visits) {
    const visitStartHour = Math.floor(v.localMinuteOfDay / 60);
    const visitEndHour = Math.ceil((v.localMinuteOfDay + v.durationMinutes) / 60);
    if (visitStartHour < startHour) startHour = visitStartHour;
    if (visitEndHour > endHour) endHour = visitEndHour;
  }
  return { startHour, endHour };
}

export function blockPosition(localMinuteOfDay: number, durationMinutes: number, gridStartHour: number, pxPerHour: number) {
  const top = ((localMinuteOfDay - gridStartHour * 60) / 60) * pxPerHour;
  const height = Math.max((durationMinutes / 60) * pxPerHour, MIN_BLOCK_HEIGHT);
  return { top, height };
}
