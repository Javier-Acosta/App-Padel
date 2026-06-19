"use server";

import { revalidatePath } from "next/cache";

import { getAuthToken, requireAdminUser } from "@/lib/auth/session";
import type { ClubSettings } from "@/lib/domain/reservations";
import {
  createCourt,
  createCourtBlock,
  deleteCourtBlock,
  updateCourt,
  upsertClubSettings,
} from "@/lib/padel/data";

const dayKeys = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

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

  for (const dayKey of dayKeys) {
    const closed = formData.get(`${dayKey}.closed`) === "on";
    const startsAt = getString(formData, `${dayKey}.startsAt`);
    const endsAt = getString(formData, `${dayKey}.endsAt`);

    openingHours[dayKey] = {
      closed,
      ranges: closed ? [] : [{ startsAt, endsAt }],
    };
  }

  await upsertClubSettings(token, {
    openingHours,
    basePrice: getNumber(formData, "basePrice"),
    depositAmount: getNumber(formData, "depositAmount"),
    paymentHoldMinutes: getNumber(formData, "paymentHoldMinutes"),
    cancellationCutoffHours: getNumber(formData, "cancellationCutoffHours"),
  });

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
    startsAt: new Date(`${date}T${startsAt}:00`).toISOString(),
    endsAt: new Date(`${date}T${endsAt}:00`).toISOString(),
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
