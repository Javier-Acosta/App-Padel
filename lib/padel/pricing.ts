import type { ClubSettings, Promotion } from "@/lib/domain/reservations";

type ReservationPriceInput = {
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  settings: ClubSettings;
  promotions: Promotion[];
};

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function timeValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function promotionMatchesRange(promotion: Promotion, startsAt: Date, endsAt: Date) {
  if (!promotion.active) {
    return false;
  }

  const reservationDate = dateValue(startsAt);

  if (
    reservationDate < dateValue(new Date(promotion.startsAt)) ||
    reservationDate > dateValue(new Date(promotion.endsAt))
  ) {
    return false;
  }

  if (!promotion.daysOfWeek.includes(startsAt.getDay())) {
    return false;
  }

  if (!promotion.timeRange) {
    return true;
  }

  return (
    timeValue(startsAt) >= promotion.timeRange.startsAt &&
    timeValue(endsAt) <= promotion.timeRange.endsAt
  );
}

export function calculateReservationPrice({
  startsAt,
  endsAt,
  durationMinutes,
  settings,
  promotions,
}: ReservationPriceInput) {
  const baseTotalPrice = settings.basePrice * (durationMinutes / 60);
  const matchingPromotion = promotions.find((promotion) =>
    promotionMatchesRange(promotion, startsAt, endsAt),
  );

  return {
    totalPrice: matchingPromotion?.priceOverride ?? baseTotalPrice,
    depositAmount: matchingPromotion?.depositOverride ?? settings.depositAmount,
    promotion: matchingPromotion,
  };
}
