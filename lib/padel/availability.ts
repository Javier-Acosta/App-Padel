import type {
  ClubSettings,
  Court,
  CourtBlock,
  Reservation,
  TurnDuration,
} from "@/lib/domain/reservations";
import {
  assertTurnDuration,
  isActiveBlockingReservation,
  timeRangesOverlap,
} from "@/lib/domain/reservations";
import { getClubDateRange, toClubDateTime } from "@/lib/padel/timezone";

export type AvailabilitySlot = {
  courtId: string;
  courtName: string;
  startsAt: string;
  endsAt: string;
};

const dayKeys = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function toDateTime(date: string, time: string) {
  return toClubDateTime(date, time);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function getDateRange(date: string) {
  return getClubDateRange(date);
}

export function calculateAvailability({
  date,
  durationMinutes,
  courts,
  settings,
  reservations,
  blocks,
}: {
  date: string;
  durationMinutes: number;
  courts: Court[];
  settings: ClubSettings;
  reservations: Reservation[];
  blocks: CourtBlock[];
}) {
  const duration = assertTurnDuration(durationMinutes);
  const dayKey = dayKeys[toDateTime(date, "12:00").getDay()];
  const openingDay = settings.openingHours[dayKey];

  if (!openingDay || openingDay.closed) {
    return [];
  }

  const activeReservations = reservations.filter((reservation) =>
    isActiveBlockingReservation(reservation),
  );

  const slots: AvailabilitySlot[] = [];

  for (const court of courts.filter((item) => item.active)) {
    for (const range of openingDay.ranges) {
      let cursor = toDateTime(date, range.startsAt);
      const rangeEnd = toDateTime(date, range.endsAt);

      while (addMinutes(cursor, duration).getTime() <= rangeEnd.getTime()) {
        const startsAt = cursor;
        const endsAt = addMinutes(cursor, duration);
        const candidate = {
          startsAt,
          endsAt,
        };

        const overlapsReservation = activeReservations.some(
          (reservation) =>
            reservation.courtId === court.id &&
            timeRangesOverlap(candidate, {
              startsAt: reservation.startsAt,
              endsAt: reservation.endsAt,
            }),
        );

        const overlapsBlock = blocks.some(
          (block) =>
            block.courtId === court.id &&
            timeRangesOverlap(candidate, {
              startsAt: block.startsAt,
              endsAt: block.endsAt,
            }),
        );

        if (!overlapsReservation && !overlapsBlock) {
          slots.push({
            courtId: court.id,
            courtName: court.name,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
          });
        }

        cursor = addMinutes(cursor, 30);
      }
    }
  }

  return slots;
}

export function parseDurationSearchParam(value: string | null): TurnDuration {
  return assertTurnDuration(Number(value));
}

export function isSlotAvailable(
  slots: AvailabilitySlot[],
  candidate: Pick<AvailabilitySlot, "courtId" | "startsAt">,
) {
  return slots.some(
    (slot) =>
      slot.courtId === candidate.courtId &&
      slot.startsAt === candidate.startsAt,
  );
}
