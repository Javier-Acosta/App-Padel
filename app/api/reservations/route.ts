import { NextResponse } from "next/server";

import { getAuthToken, getCurrentUser } from "@/lib/auth/session";
import { assertTurnDuration } from "@/lib/domain/reservations";
import {
  calculateAvailability,
  getDateRange,
  isSlotAvailable,
} from "@/lib/padel/availability";
import {
  createPendingReservation,
  getActiveCourts,
  getClubSettings,
  getCourtBlocksForRange,
  getReservationsForRange,
} from "@/lib/padel/data";

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
    const date = input.startsAt.slice(0, 10);
    const range = getDateRange(date);
    const [courts, settings, reservations, blocks] = await Promise.all([
      getActiveCourts(token),
      getClubSettings(token),
      getReservationsForRange(token, range.startsAt, range.endsAt),
      getCourtBlocksForRange(token, range.startsAt, range.endsAt),
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

    const reservation = await createPendingReservation(token, {
      userId: user.id,
      courtId: input.courtId,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      durationMinutes: input.durationMinutes,
      totalPrice: settings.basePrice,
      depositAmount: settings.depositAmount,
      expiresAt: new Date(
        Date.now() + settings.paymentHoldMinutes * 60 * 1000,
      ).toISOString(),
    });

    return NextResponse.json({ reservation }, { status: 201 });
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
