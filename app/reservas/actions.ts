"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthToken, getCurrentUser } from "@/lib/auth/session";
import { canUserCancelReservation } from "@/lib/domain/reservations";
import { createReservationDepositPreference } from "@/lib/payments/mercadopago";
import { authenticatePocketBaseAdmin } from "@/lib/pocketbase/client";
import {
  calculateAvailability,
  getDateRange,
  isSlotAvailable,
} from "@/lib/padel/availability";
import {
  getActiveCourts,
  getClubSettings,
  getCourtBlocksForRange,
  getPaymentForReservation,
  getReservationsForDate,
  getUpcomingReservationsForUser,
  createPayment,
  updateReservationSchedule,
  updateReservationStatus,
  updatePayment,
} from "@/lib/padel/data";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

export async function cancelReservationAction(formData: FormData) {
  const [user, token] = await Promise.all([getCurrentUser(), getAuthToken()]);

  if (!user || !token) {
    throw new Error("Unauthorized.");
  }

  const reservationId = getString(formData, "reservationId");
  const [settings, reservations] = await Promise.all([
    getClubSettings(token),
    getUpcomingReservationsForUser(token, user.id),
  ]);
  const reservation = reservations.find((item) => item.id === reservationId);

  if (!reservation) {
    throw new Error("Reservation not found.");
  }

  if (
    !canUserCancelReservation(
      reservation,
      new Date(),
      settings?.cancellationCutoffHours ?? 3,
    )
  ) {
    throw new Error("This reservation can no longer be cancelled.");
  }

  await updateReservationStatus(token, reservation.id, "cancelled_by_user");

  revalidatePath("/reservas");
  revalidatePath("/admin");
}

export async function rescheduleReservationAction(formData: FormData) {
  const [user, token] = await Promise.all([getCurrentUser(), getAuthToken()]);

  if (!user || !token) {
    throw new Error("Unauthorized.");
  }

  const reservationId = getString(formData, "reservationId");
  const courtId = getString(formData, "courtId");
  const date = getString(formData, "date");
  const startsAtValue = getString(formData, "startsAt");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("date must use YYYY-MM-DD format.");
  }

  const [settings, userReservations] = await Promise.all([
    getClubSettings(token),
    getUpcomingReservationsForUser(token, user.id),
  ]);
  const reservation = userReservations.find((item) => item.id === reservationId);

  if (!settings) {
    throw new Error("Club settings are not configured.");
  }

  if (!reservation) {
    throw new Error("Reservation not found.");
  }

  if (
    !canUserCancelReservation(
      reservation,
      new Date(),
      settings.cancellationCutoffHours,
    )
  ) {
    throw new Error("This reservation can no longer be rescheduled.");
  }

  const startsAt = /^\d{2}:\d{2}$/.test(startsAtValue)
    ? new Date(`${date}T${startsAtValue}:00`)
    : new Date(startsAtValue);

  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("startsAt must be a valid date.");
  }
  const endsAt = new Date(
    startsAt.getTime() + reservation.durationMinutes * 60 * 1000,
  );
  const range = getDateRange(date);
  const [courts, reservations, blocks] = await Promise.all([
    getActiveCourts(token),
    getReservationsForDate(token, date, range.startsAt, range.endsAt),
    getCourtBlocksForRange(token, range.startsAt, range.endsAt),
  ]);
  const availableSlots = calculateAvailability({
    date,
    durationMinutes: reservation.durationMinutes,
    courts,
    settings,
    reservations: reservations.filter((item) => item.id !== reservation.id),
    blocks,
  });

  if (
    !isSlotAvailable(availableSlots, {
      courtId,
      startsAt: startsAt.toISOString(),
    })
  ) {
    throw new Error("That slot is no longer available.");
  }

  await updateReservationSchedule(token, reservation.id, {
    courtId,
    reservationDate: date,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  });

  revalidatePath("/reservas");
  revalidatePath("/admin");
}

export async function payReservationDepositAction(formData: FormData) {
  const [user, token] = await Promise.all([getCurrentUser(), getAuthToken()]);

  if (!user || !token) {
    throw new Error("Unauthorized.");
  }

  const reservationId = getString(formData, "reservationId");
  const reservations = await getUpcomingReservationsForUser(token, user.id);
  const reservation = reservations.find((item) => item.id === reservationId);

  if (!reservation) {
    throw new Error("Reservation not found.");
  }

  if (reservation.status !== "pending_payment") {
    throw new Error("Only pending reservations can be paid.");
  }

  const preference = await createReservationDepositPreference({
    reservation,
    user,
  });

  if (!preference.checkoutUrl) {
    throw new Error("Mercado Pago did not return a checkout URL.");
  }

  const adminAuth = await authenticatePocketBaseAdmin();
  const existingPayment = await getPaymentForReservation(
    adminAuth.token,
    reservation.id,
  );

  if (existingPayment) {
    await updatePayment(adminAuth.token, existingPayment.id, {
      providerPreferenceId: preference.id,
      status: "pending",
      amount: reservation.depositAmount,
    });
  } else {
    await createPayment(adminAuth.token, {
      reservationId: reservation.id,
      providerPreferenceId: preference.id,
      status: "pending",
      amount: reservation.depositAmount,
    });
  }

  redirect(preference.checkoutUrl);
}
