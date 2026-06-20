import type { ClubOpeningHours } from "@/lib/domain/reservations";

export const CLUB_OPENING_START = "08:00";
export const CLUB_OPENING_END = "23:00";

export const clubDayKeys = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export function createDefaultOpeningHours(): ClubOpeningHours {
  return Object.fromEntries(
    clubDayKeys.map((dayKey) => [
      dayKey,
      { ranges: [{ startsAt: CLUB_OPENING_START, endsAt: CLUB_OPENING_END }] },
    ]),
  );
}

export function normalizeOpeningHours(
  openingHours: ClubOpeningHours | null | undefined,
): ClubOpeningHours {
  const defaultOpeningHours = createDefaultOpeningHours();

  return Object.fromEntries(
    clubDayKeys.map((dayKey) => {
      const day = openingHours?.[dayKey];

      if (day?.closed) {
        return [dayKey, { closed: true, ranges: [] }];
      }

      return [dayKey, defaultOpeningHours[dayKey]];
    }),
  );
}
