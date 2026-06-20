import type {
  ClubSettings,
  Court,
  CourtBlock,
  Payment,
  Reservation,
  ReservationStatus,
  TurnDuration,
  UserProfile,
} from "@/lib/domain/reservations";
import {
  createPocketBaseRecord,
  deletePocketBaseRecord,
  getPocketBaseFileUrl,
  listPocketBaseRecords,
  updatePocketBaseRecord,
} from "@/lib/pocketbase/client";
import { normalizeOpeningHours } from "@/lib/padel/opening-hours";

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
  reservationDate?: string;
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

type PocketBaseUserRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserProfile["role"];
  created: string;
};

type PocketBasePaymentRecord = {
  id: string;
  reservationId: string;
  provider: Payment["provider"];
  providerPreferenceId?: string;
  providerPaymentId?: string;
  status: Payment["status"];
  amount: number;
  rawWebhookData?: unknown;
  created: string;
  updated: string;
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
    openingHours: normalizeOpeningHours(record.openingHours),
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

function mapCourtBlock(record: PocketBaseCourtBlockRecord): CourtBlock {
  return {
    id: record.id,
    courtId: record.courtId,
    startsAt: record.startsAt,
    endsAt: record.endsAt,
    reason: record.reason,
    createdBy: record.createdBy,
  };
}

function mapReservation(record: PocketBaseReservationRecord): Reservation {
  return {
    id: record.id,
    userId: record.userId,
    courtId: record.courtId,
    reservationDate: record.reservationDate ?? record.startsAt.slice(0, 10),
    startsAt: record.startsAt,
    endsAt: record.endsAt,
    durationMinutes: Number(record.durationMinutes) as TurnDuration,
    status: record.status,
    totalPrice: record.totalPrice,
    depositAmount: record.depositAmount,
    expiresAt: record.expiresAt,
    createdAt: record.created,
    updatedAt: record.updated,
  };
}

function mapUserProfile(record: PocketBaseUserRecord): UserProfile {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    phone: record.phone,
    role: record.role,
    createdAt: record.created,
  };
}

function mapPayment(record: PocketBasePaymentRecord): Payment {
  return {
    id: record.id,
    reservationId: record.reservationId,
    provider: record.provider,
    providerPreferenceId: record.providerPreferenceId,
    providerPaymentId: record.providerPaymentId,
    status: record.status,
    amount: record.amount,
    rawWebhookData: record.rawWebhookData,
    createdAt: record.created,
    updatedAt: record.updated,
  };
}

export async function getAllCourts(token: string) {
  const result = await listPocketBaseRecords<PocketBaseCourtRecord>("courts", {
    token,
    searchParams: {
      page: 1,
      perPage: 100,
      sort: "name",
    },
  });

  return result.items.map(mapCourt);
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

export async function createCourt(
  token: string,
  input: Pick<Court, "name" | "active">,
) {
  const record = await createPocketBaseRecord<PocketBaseCourtRecord>(
    "courts",
    {
      name: input.name,
      active: input.active,
    },
    { token },
  );

  return mapCourt(record);
}

export async function updateCourt(
  token: string,
  id: string,
  input: Pick<Court, "name" | "active">,
) {
  const record = await updatePocketBaseRecord<PocketBaseCourtRecord>(
    "courts",
    id,
    {
      name: input.name,
      active: input.active,
    },
    { token },
  );

  return mapCourt(record);
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

export async function getClubSettingsRecord(token: string) {
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

  const record = result.items[0];

  return record
    ? {
        id: record.id,
        key: record.key,
        settings: mapClubSettings(record),
      }
    : null;
}

export async function upsertClubSettings(
  token: string,
  input: ClubSettings,
) {
  const existing = await getClubSettingsRecord(token);
  const body = {
    key: "default",
    openingHours: input.openingHours,
    basePrice: input.basePrice,
    depositAmount: input.depositAmount,
    paymentHoldMinutes: input.paymentHoldMinutes,
    cancellationCutoffHours: input.cancellationCutoffHours,
  };

  if (!existing) {
    const record = await createPocketBaseRecord<PocketBaseClubSettingsRecord>(
      "club_settings",
      body,
      { token },
    );

    return mapClubSettings(record);
  }

  const record = await updatePocketBaseRecord<PocketBaseClubSettingsRecord>(
    "club_settings",
    existing.id,
    body,
    { token },
  );

  return mapClubSettings(record);
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

  return result.items.map(mapReservation);
}

export async function getReservationsForDate(
  token: string,
  date: string,
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
        filter: `reservationDate = "${date}" || (reservationDate = "" && startsAt < "${endsAt}" && endsAt > "${startsAt}")`,
      },
    },
  );

  return result.items.map((record) => ({
    ...mapReservation(record),
    reservationDate: record.reservationDate ?? date,
  }));
}

export async function getUpcomingReservationsForUser(
  token: string,
  userId: string,
) {
  const result = await listPocketBaseRecords<PocketBaseReservationRecord>(
    "reservations",
    {
      token,
      searchParams: {
        page: 1,
        perPage: 50,
        filter: `userId = "${userId}" && endsAt >= "${new Date().toISOString()}"`,
        sort: "startsAt",
      },
    },
  );

  return result.items.map(mapReservation);
}

export async function getUpcomingReservations(
  token: string,
  filters: {
    status?: ReservationStatus;
    courtId?: string;
    date?: string;
  } = {},
) {
  const filterParts = [`endsAt >= "${new Date().toISOString()}"`];

  if (filters.status) {
    filterParts.push(`status = "${filters.status}"`);
  }

  if (filters.courtId) {
    filterParts.push(`courtId = "${filters.courtId}"`);
  }

  if (filters.date) {
    const { startsAt, endsAt } = getDayRange(filters.date);
    filterParts.push(`startsAt < "${endsAt}" && endsAt > "${startsAt}"`);
  }

  const result = await listPocketBaseRecords<PocketBaseReservationRecord>(
    "reservations",
    {
      token,
      searchParams: {
        page: 1,
        perPage: 100,
        filter: filterParts.join(" && "),
        sort: "startsAt",
      },
    },
  );

  return result.items.map(mapReservation);
}

function getDayRange(date: string) {
  return {
    startsAt: new Date(`${date}T00:00:00`).toISOString(),
    endsAt: new Date(`${date}T23:59:59.999`).toISOString(),
  };
}

export async function getUserProfilesByIds(token: string, userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);

  if (uniqueIds.length === 0) {
    return [];
  }

  const result = await listPocketBaseRecords<PocketBaseUserRecord>("users", {
    token,
    searchParams: {
      page: 1,
      perPage: Math.min(uniqueIds.length, 100),
      filter: uniqueIds.map((id) => `id = "${id}"`).join(" || "),
    },
  });

  return result.items.map(mapUserProfile);
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

  return result.items.map(mapCourtBlock);
}

export async function getUpcomingCourtBlocks(token: string) {
  const result = await listPocketBaseRecords<PocketBaseCourtBlockRecord>(
    "court_blocks",
    {
      token,
      searchParams: {
        page: 1,
        perPage: 100,
        filter: `endsAt >= "${new Date().toISOString()}"`,
        sort: "startsAt",
      },
    },
  );

  return result.items.map(mapCourtBlock);
}

export async function createCourtBlock(
  token: string,
  input: Omit<CourtBlock, "id">,
) {
  const record = await createPocketBaseRecord<PocketBaseCourtBlockRecord>(
    "court_blocks",
    input,
    { token },
  );

  return mapCourtBlock(record);
}

export async function deleteCourtBlock(token: string, id: string) {
  await deletePocketBaseRecord("court_blocks", id, { token });
}

export async function createPendingReservation(
  token: string,
  input: {
    userId: string;
    courtId: string;
    reservationDate: string;
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
      reservationDate: input.reservationDate,
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
    ...mapReservation(record),
    reservationDate: record.reservationDate ?? input.reservationDate,
  } satisfies Reservation;
}

export async function updateReservationStatus(
  token: string,
  id: string,
  status: ReservationStatus,
) {
  const record = await updatePocketBaseRecord<PocketBaseReservationRecord>(
    "reservations",
    id,
    { status },
    { token },
  );

  return mapReservation(record);
}

export async function updateReservationSchedule(
  token: string,
  id: string,
  input: {
    courtId: string;
    reservationDate: string;
    startsAt: string;
    endsAt: string;
  },
) {
  const record = await updatePocketBaseRecord<PocketBaseReservationRecord>(
    "reservations",
    id,
    input,
    { token },
  );

  return mapReservation(record);
}

export async function getReservationById(token: string, id: string) {
  const result = await listPocketBaseRecords<PocketBaseReservationRecord>(
    "reservations",
    {
      token,
      searchParams: {
        page: 1,
        perPage: 1,
        filter: `id = "${id}"`,
      },
    },
  );

  return result.items[0] ? mapReservation(result.items[0]) : null;
}

export async function getPaymentForReservation(
  token: string,
  reservationId: string,
) {
  const result = await listPocketBaseRecords<PocketBasePaymentRecord>(
    "payments",
    {
      token,
      searchParams: {
        page: 1,
        perPage: 1,
        filter: `reservationId = "${reservationId}"`,
        sort: "-created",
      },
    },
  );

  return result.items[0] ? mapPayment(result.items[0]) : null;
}

export async function getPaymentByProviderPaymentId(
  token: string,
  providerPaymentId: string,
) {
  const result = await listPocketBaseRecords<PocketBasePaymentRecord>(
    "payments",
    {
      token,
      searchParams: {
        page: 1,
        perPage: 1,
        filter: `provider = "mercadopago" && providerPaymentId = "${providerPaymentId}"`,
      },
    },
  );

  return result.items[0] ? mapPayment(result.items[0]) : null;
}

export async function createPayment(
  token: string,
  input: {
    reservationId: string;
    providerPreferenceId?: string;
    providerPaymentId?: string;
    status: Payment["status"];
    amount: number;
    rawWebhookData?: unknown;
  },
) {
  const record = await createPocketBaseRecord<PocketBasePaymentRecord>(
    "payments",
    {
      reservationId: input.reservationId,
      provider: "mercadopago",
      providerPreferenceId: input.providerPreferenceId,
      providerPaymentId: input.providerPaymentId,
      status: input.status,
      amount: input.amount,
      rawWebhookData: input.rawWebhookData,
    },
    { token },
  );

  return mapPayment(record);
}

export async function updatePayment(
  token: string,
  id: string,
  input: Partial<{
    providerPreferenceId: string;
    providerPaymentId: string;
    status: Payment["status"];
    amount: number;
    rawWebhookData: unknown;
  }>,
) {
  const record = await updatePocketBaseRecord<PocketBasePaymentRecord>(
    "payments",
    id,
    input,
    { token },
  );

  return mapPayment(record);
}
