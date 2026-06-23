export const CLUB_TIME_ZONE = "America/Argentina/Buenos_Aires";

const CLUB_UTC_OFFSET = "-03:00";

export function toClubDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00${CLUB_UTC_OFFSET}`);
}

export function getClubDateRange(date: string) {
  return {
    startsAt: new Date(`${date}T00:00:00${CLUB_UTC_OFFSET}`).toISOString(),
    endsAt: new Date(`${date}T23:59:59.999${CLUB_UTC_OFFSET}`).toISOString(),
  };
}

export function getClubDateValue(value: string | Date = new Date()) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const partByType = new Map(parts.map((part) => [part.type, part.value]));

  return `${partByType.get("year")}-${partByType.get("month")}-${partByType.get("day")}`;
}

export function addClubDays(date: string, days: number) {
  const value = toClubDateTime(date, "12:00");
  value.setUTCDate(value.getUTCDate() + days);

  return getClubDateValue(value);
}

export function formatClubTime(value: string | Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: CLUB_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(typeof value === "string" ? new Date(value) : value);
}
