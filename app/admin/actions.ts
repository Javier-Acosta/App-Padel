"use server";

import { revalidatePath } from "next/cache";

import { getAuthToken, requireAdminUser } from "@/lib/auth/session";
import {
  isReservationStatus,
  type ClubSettings,
  type Promotion,
} from "@/lib/domain/reservations";
import {
  createCourt,
  createCourtBlock,
  createPromotion,
  deleteCourtBlock,
  deletePromotion,
  updateCourt,
  updatePromotion,
  updateReservationStatus,
  upsertClubSettings,
} from "@/lib/padel/data";
import { normalizeOpeningHours, clubDayKeys } from "@/lib/padel/opening-hours";
import { toClubDateTime } from "@/lib/padel/timezone";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

function getNumber(formData: FormData, key: string) {
  const value = Number(getString(formData, key));

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${key} must be a positive number.`);
  }

  return value;
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error(`${key} must be a positive number.`);
  }

  return parsedValue;
}

function getPromotionInput(formData: FormData): Omit<Promotion, "id"> {
  const daysOfWeek = formData
    .getAll("daysOfWeek")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
  const timeStartsAt = formData.get("timeRange.startsAt");
  const timeEndsAt = formData.get("timeRange.endsAt");

  if (daysOfWeek.length === 0) {
    throw new Error("At least one day is required.");
  }

  return {
    name: getString(formData, "name"),
    active: formData.get("active") === "on",
    startsAt: toClubDateTime(
      getString(formData, "startsAt"),
      "00:00",
    ).toISOString(),
    endsAt: new Date(
      toClubDateTime(getString(formData, "endsAt"), "23:59").getTime() +
        59 * 1000,
    ).toISOString(),
    daysOfWeek,
    ...(typeof timeStartsAt === "string" &&
    timeStartsAt.length > 0 &&
    typeof timeEndsAt === "string" &&
    timeEndsAt.length > 0
      ? {
          timeRange: {
            startsAt: timeStartsAt,
            endsAt: timeEndsAt,
          },
        }
      : {}),
    priceOverride: getOptionalNumber(formData, "priceOverride"),
    depositOverride: getOptionalNumber(formData, "depositOverride"),
  };
}

async function requireAdminToken() {
  await requireAdminUser();
  const token = await getAuthToken();

  if (!token) {
    throw new Error("Unauthorized.");
  }

  return token;
}

export async function createCourtAction(formData: FormData) {
  const token = await requireAdminToken();

  await createCourt(token, {
    name: getString(formData, "name"),
    active: formData.get("active") === "on",
  });

  revalidatePath("/admin");
  revalidatePath("/reservas");
}

export async function updateCourtAction(formData: FormData) {
  const token = await requireAdminToken();

  await updateCourt(token, getString(formData, "id"), {
    name: getString(formData, "name"),
    active: formData.get("active") === "on",
  });

  revalidatePath("/admin");
  revalidatePath("/reservas");
}

export async function updateSettingsAction(formData: FormData) {
  const token = await requireAdminToken();
  const openingHours: ClubSettings["openingHours"] = {};

  for (const dayKey of clubDayKeys) {
    const closed = formData.get(`${dayKey}.closed`) === "on";
    const startsAt = getString(formData, `${dayKey}.startsAt`);
    const endsAt = getString(formData, `${dayKey}.endsAt`);

    openingHours[dayKey] = {
      closed,
      ranges: closed ? [] : [{ startsAt, endsAt }],
    };
  }

  await upsertClubSettings(token, {
    openingHours: normalizeOpeningHours(openingHours),
    basePrice: getNumber(formData, "basePrice"),
    depositAmount: getNumber(formData, "depositAmount"),
    paymentHoldMinutes: getNumber(formData, "paymentHoldMinutes"),
    cancellationCutoffHours: getNumber(formData, "cancellationCutoffHours"),
  });

  revalidatePath("/admin");
  revalidatePath("/reservas");
}

export async function createPromotionAction(formData: FormData) {
  const token = await requireAdminToken();

  await createPromotion(token, getPromotionInput(formData));

  revalidatePath("/admin");
  revalidatePath("/reservas");
}

export async function updatePromotionAction(formData: FormData) {
  const token = await requireAdminToken();

  await updatePromotion(
    token,
    getString(formData, "id"),
    getPromotionInput(formData),
  );

  revalidatePath("/admin");
  revalidatePath("/reservas");
}

export async function deletePromotionAction(formData: FormData) {
  const token = await requireAdminToken();

  await deletePromotion(token, getString(formData, "id"));

  revalidatePath("/admin");
  revalidatePath("/reservas");
}

export async function createCourtBlockAction(formData: FormData) {
  const token = await requireAdminToken();
  const user = await requireAdminUser();
  const date = getString(formData, "date");
  const startsAt = getString(formData, "startsAt");
  const endsAt = getString(formData, "endsAt");

  await createCourtBlock(token, {
    courtId: getString(formData, "courtId"),
    startsAt: toClubDateTime(date, startsAt).toISOString(),
    endsAt: toClubDateTime(date, endsAt).toISOString(),
    reason: getString(formData, "reason"),
    createdBy: user.id,
  });

  revalidatePath("/admin");
  revalidatePath("/reservas");
}

export async function deleteCourtBlockAction(formData: FormData) {
  const token = await requireAdminToken();

  await deleteCourtBlock(token, getString(formData, "id"));

  revalidatePath("/admin");
  revalidatePath("/reservas");
}

export async function updateReservationStatusAction(formData: FormData) {
  const token = await requireAdminToken();
  const status = getString(formData, "status");

  if (!isReservationStatus(status)) {
    throw new Error("Invalid reservation status.");
  }

  await updateReservationStatus(token, getString(formData, "id"), status);

  revalidatePath("/admin");
  revalidatePath("/reservas");
}
