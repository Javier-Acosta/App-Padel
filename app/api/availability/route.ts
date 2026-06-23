import { NextResponse } from "next/server";

import {
  calculateAvailability,
  getDateRange,
  parseDurationSearchParam,
} from "@/lib/padel/availability";
import {
  getActiveCourts,
  getClubSettings,
  getCourtBlocksForRange,
  getReservationsForDate,
} from "@/lib/padel/data";
import { getAuthToken, getCurrentUser } from "@/lib/auth/session";

function parseDateSearchParam(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("date must use YYYY-MM-DD format.");
  }

  return value;
}

export async function GET(request: Request) {
  const [user, token] = await Promise.all([getCurrentUser(), getAuthToken()]);

  if (!user || !token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const date = parseDateSearchParam(url.searchParams.get("date"));
    const duration = parseDurationSearchParam(url.searchParams.get("duration"));
    const excludeReservationId = url.searchParams.get("excludeReservationId");
    const range = getDateRange(date);
    const [courts, settings, reservations, blocks] = await Promise.all([
      getActiveCourts(token),
      getClubSettings(token),
      getReservationsForDate(token, date, range.startsAt, range.endsAt),
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
      durationMinutes: duration,
      courts,
      settings,
      reservations: excludeReservationId
        ? reservations.filter(
            (reservation) =>
              reservation.id !== excludeReservationId ||
              reservation.userId !== user.id,
          )
        : reservations,
      blocks,
    });

    return NextResponse.json({ slots });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to calculate availability.",
      },
      { status: 400 },
    );
  }
}
