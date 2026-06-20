export const MIN_TURN_DURATION_MINUTES = 60;
export const MAX_TURN_DURATION_MINUTES = 15 * 60;
export const TURN_DURATION_STEP_MINUTES = 30;

export type TurnDuration = number;

export const RESERVATION_STATUSES = [
  "pending_payment",
  "confirmed",
  "expired",
  "cancelled_by_user",
  "cancelled_by_admin",
  "completed",
  "no_show",
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const USER_ROLES = ["user", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: string;
};

export type Court = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClubOpeningHours = Record<
  string,
  {
    closed?: boolean;
    ranges: Array<{
      startsAt: string;
      endsAt: string;
    }>;
  }
>;

export type ClubSettings = {
  openingHours: ClubOpeningHours;
  basePrice: number;
  depositAmount: number;
  paymentHoldMinutes: number;
  cancellationCutoffHours: number;
  logoUrl?: string;
};

export type Promotion = {
  id: string;
  name: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
  daysOfWeek: number[];
  timeRange?: {
    startsAt: string;
    endsAt: string;
  };
  priceOverride?: number;
  depositOverride?: number;
};

export type CourtBlock = {
  id: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdBy: string;
};

export type Reservation = {
  id: string;
  userId: string;
  courtId: string;
  reservationDate: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: TurnDuration;
  status: ReservationStatus;
  totalPrice: number;
  depositAmount: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentProvider = "mercadopago";

export type PaymentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "review_required";

export type Payment = {
  id: string;
  reservationId: string;
  provider: PaymentProvider;
  providerPreferenceId?: string;
  providerPaymentId?: string;
  status: PaymentStatus;
  amount: number;
  rawWebhookData?: unknown;
  createdAt: string;
  updatedAt: string;
};

export function isTurnDuration(value: number): value is TurnDuration {
  return (
    Number.isInteger(value) &&
    value >= MIN_TURN_DURATION_MINUTES &&
    value <= MAX_TURN_DURATION_MINUTES &&
    value % TURN_DURATION_STEP_MINUTES === 0
  );
}

export function assertTurnDuration(value: number): TurnDuration {
  if (!isTurnDuration(value)) {
    throw new Error("Turn duration must be between 1 and 15 hours in 30-minute steps.");
  }

  return value;
}

export function isReservationStatus(
  value: string,
): value is ReservationStatus {
  return RESERVATION_STATUSES.includes(value as ReservationStatus);
}

export function isActiveBlockingReservation(
  reservation: Pick<Reservation, "status" | "expiresAt">,
) {
  if (
    reservation.status === "confirmed" ||
    reservation.status === "pending_payment"
  ) {
    return true;
  }

  return false;
}

export function canUserCancelReservation(
  reservation: Pick<Reservation, "status" | "startsAt">,
  now = new Date(),
  cutoffHours = 3,
) {
  if (
    reservation.status !== "confirmed" &&
    reservation.status !== "pending_payment"
  ) {
    return false;
  }

  const cutoffMs = cutoffHours * 60 * 60 * 1000;
  return new Date(reservation.startsAt).getTime() - now.getTime() > cutoffMs;
}

export function timeRangesOverlap(
  first: { startsAt: string | Date; endsAt: string | Date },
  second: { startsAt: string | Date; endsAt: string | Date },
) {
  const firstStart = new Date(first.startsAt).getTime();
  const firstEnd = new Date(first.endsAt).getTime();
  const secondStart = new Date(second.startsAt).getTime();
  const secondEnd = new Date(second.endsAt).getTime();

  return firstStart < secondEnd && secondStart < firstEnd;
}

