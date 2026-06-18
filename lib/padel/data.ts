import type {
  ClubSettings,
  Court,
  CourtBlock,
  Reservation,
  ReservationStatus,
  TurnDuration,
} from "@/lib/domain/reservations";
import {
  createPocketBaseRecord,
  getPocketBaseFileUrl,
  listPocketBaseRecords,
} from "@/lib/pocketbase/client";

type PocketBaseCourtRecord = {
  id: string;
  name: string;
  active: boolean;
  created: string;
  updated: string;
};

type PocketBaseClubSettingsRecord = {
  id: string;
  collectionName?: string;
  key: string;
  openingHours: ClubSettings["openingHours"];
  basePrice: number;
  depositAmount: number;
  paymentHoldMinutes: number;
  cancellationCutoffHours: number;
  logo?: string;
};

type PocketBaseReservationRecord = {
  id: string;
  userId: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: string;
  status: ReservationStatus;
  totalPrice: number;
  depositAmount: number;
  expiresAt?: string;
  created: string;
  updated: string;
};

type PocketBaseCourtBlockRecord = {
  id: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdBy: string;
};

function mapCourt(record: PocketBaseCourtRecord): Court {
  return {
    id: record.id,
    name: record.name,
    active: record.active,
    createdAt: record.created,
    updatedAt: record.updated,
  };
}

function mapClubSettings(record: PocketBaseClubSettingsRecord): ClubSettings {
  return {
    openingHours: record.openingHours,
    basePrice: record.basePrice,
    depositAmount: record.depositAmount,
    paymentHoldMinutes: record.paymentHoldMinutes,
    cancellationCutoffHours: record.cancellationCutoffHours,
    ...(record.logo
      ? {
          logoUrl: getPocketBaseFileUrl(
            record.collectionName ?? "club_settings",
            record.id,
            record.logo,
          ),
        }
      : {}),
  };
}

export async function getActiveCourts(token: string) {
  const result = await listPocketBaseRecords<PocketBaseCourtRecord>("courts", {
    token,
    searchParams: {
      page: 1,
      perPage: 50,
      filter: "active = true",
      sort: "name",
    },
  });

  return result.items.map(mapCourt);
}

export async function getClubSettings(token: string) {
  const result = await listPocketBaseRecords<PocketBaseClubSettingsRecord>(
    "club_settings",
    {
      token,
      searchParams: {
        page: 1,
        perPage: 1,
        filter: 'key = "default"',
      },
    },
  );

  return result.items[0] ? mapClubSettings(result.items[0]) : null;
}

export async function getPublicClubSettings() {
  try {
    const result = await listPocketBaseRecords<PocketBaseClubSettingsRecord>(
      "club_settings",
      {
        searchParams: {
          page: 1,
          perPage: 1,
          filter: 'key = "default"',
        },
      },
    );

    return result.items[0] ? mapClubSettings(result.items[0]) : null;
  } catch {
    return null;
  }
}

export async function getReservationsForRange(
  token: string,
  startsAt: string,
  endsAt: string,
) {
  const result = await listPocketBaseRecords<PocketBaseReservationRecord>(
    "reservations",
    {
      token,
      searchParams: {
        page: 1,
        perPage: 200,
        filter: `startsAt < "${endsAt}" && endsAt > "${startsAt}"`,
      },
    },
  );

  return result.items.map(
    (record): Reservation => ({
      id: record.id,
      userId: record.userId,
      courtId: record.courtId,
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      durationMinutes: Number(record.durationMinutes) as TurnDuration,
      status: record.status,
      totalPrice: record.totalPrice,
      depositAmount: record.depositAmount,
      expiresAt: record.expiresAt,
      createdAt: record.created,
      updatedAt: record.updated,
    }),
  );
}

export async function getCourtBlocksForRange(
  token: string,
  startsAt: string,
  endsAt: string,
) {
  const result = await listPocketBaseRecords<PocketBaseCourtBlockRecord>(
    "court_blocks",
    {
      token,
      searchParams: {
        page: 1,
        perPage: 200,
        filter: `startsAt < "${endsAt}" && endsAt > "${startsAt}"`,
      },
    },
  );

  return result.items.map(
    (record): CourtBlock => ({
      id: record.id,
      courtId: record.courtId,
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      reason: record.reason,
      createdBy: record.createdBy,
    }),
  );
}

export async function createPendingReservation(
  token: string,
  input: {
    userId: string;
    courtId: string;
    startsAt: string;
    endsAt: string;
    durationMinutes: TurnDuration;
    totalPrice: number;
    depositAmount: number;
    expiresAt: string;
  },
) {
  const record = await createPocketBaseRecord<PocketBaseReservationRecord>(
    "reservations",
    {
      userId: input.userId,
      courtId: input.courtId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      durationMinutes: String(input.durationMinutes),
      status: "pending_payment",
      totalPrice: input.totalPrice,
      depositAmount: input.depositAmount,
      expiresAt: input.expiresAt,
    },
    { token },
  );

  return {
    id: record.id,
    userId: record.userId,
    courtId: record.courtId,
    startsAt: record.startsAt,
    endsAt: record.endsAt,
    durationMinutes: Number(record.durationMinutes) as TurnDuration,
    status: record.status,
    totalPrice: record.totalPrice,
    depositAmount: record.depositAmount,
    expiresAt: record.expiresAt,
    createdAt: record.created,
    updatedAt: record.updated,
  } satisfies Reservation;
}
