import { NextResponse } from "next/server";

import { getAuthToken, getCurrentUser } from "@/lib/auth/session";
import { assertTurnDuration } from "@/lib/domain/reservations";
import { authenticatePocketBaseAdmin } from "@/lib/pocketbase/client";
import {
  calculateAvailability,
  getDateRange,
  isSlotAvailable,
} from "@/lib/padel/availability";
import {
  createPendingReservation,
  createPayment,
  getActiveCourts,
  getActivePromotionsForRange,
  getClubSettings,
  getCourtBlocksForRange,
  getReservationsForDate,
} from "@/lib/padel/data";
import { createReservationDepositPreference } from "@/lib/payments/mercadopago";
import { calculateReservationPrice } from "@/lib/padel/pricing";

function parseReservationDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("date must use YYYY-MM-DD format.");
  }

  return value;
}

function parseCreateReservationInput(input: unknown) {
  const payload = input as Record<string, unknown>;

  if (typeof payload.courtId !== "string" || payload.courtId.length === 0) {
    throw new Error("courtId is required.");
  }

  if (
    typeof payload.startsAt !== "string" ||
    Number.isNaN(new Date(payload.startsAt).getTime())
  ) {
    throw new Error("startsAt must be a valid date.");
  }

  return {
    courtId: payload.courtId,
    date: parseReservationDate(payload.date),
    startsAt: payload.startsAt,
    durationMinutes: assertTurnDuration(Number(payload.durationMinutes)),
  };
}

export async function POST(request: Request) {
  const [user, token] = await Promise.all([getCurrentUser(), getAuthToken()]);

  if (!user || !token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const input = parseCreateReservationInput(await request.json());
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(
      startsAt.getTime() + input.durationMinutes * 60 * 1000,
    );
    const date = input.date;
    const range = getDateRange(date);
    const [courts, settings, reservations, blocks, promotions] = await Promise.all([
      getActiveCourts(token),
      getClubSettings(token),
      getReservationsForDate(token, date, range.startsAt, range.endsAt),
      getCourtBlocksForRange(token, range.startsAt, range.endsAt),
      getActivePromotionsForRange(token, range.startsAt, range.endsAt),
    ]);

    if (!settings) {
      return NextResponse.json(
        { error: "Club settings are not configured." },
        { status: 409 },
      );
    }

    const slots = calculateAvailability({
      date,
      durationMinutes: input.durationMinutes,
      courts,
      settings,
      reservations,
      blocks,
    });

    if (
      !isSlotAvailable(slots, {
        courtId: input.courtId,
        startsAt: startsAt.toISOString(),
      })
    ) {
      return NextResponse.json(
        { error: "That slot is no longer available." },
        { status: 409 },
      );
    }

    const price = calculateReservationPrice({
      startsAt,
      endsAt,
      durationMinutes: input.durationMinutes,
      settings,
      promotions,
    });

    const reservation = await createPendingReservation(token, {
      userId: user.id,
      courtId: input.courtId,
      reservationDate: date,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      durationMinutes: input.durationMinutes,
      totalPrice: price.totalPrice,
      depositAmount: price.depositAmount,
      expiresAt: new Date(
        Date.now() + settings.paymentHoldMinutes * 60 * 1000,
      ).toISOString(),
    });
    const paymentPreference = await createReservationDepositPreference({
      reservation,
      user,
    });

    if (!paymentPreference.checkoutUrl) {
      throw new Error("Mercado Pago did not return a checkout URL.");
    }

    const adminAuth = await authenticatePocketBaseAdmin();

    await createPayment(adminAuth.token, {
      reservationId: reservation.id,
      providerPreferenceId: paymentPreference.id,
      status: "pending",
      amount: reservation.depositAmount,
    });

    return NextResponse.json(
      {
        reservation,
        payment: {
          provider: "mercadopago",
          preferenceId: paymentPreference.id,
          checkoutUrl: paymentPreference.checkoutUrl,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create reservation.",
      },
      { status: 400 },
    );
  }
}
