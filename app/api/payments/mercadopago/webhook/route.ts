import { NextResponse } from "next/server";

import { authenticatePocketBaseAdmin } from "@/lib/pocketbase/client";
import { getMercadoPagoPayment } from "@/lib/payments/mercadopago";
import {
  createPayment,
  getPaymentByProviderPaymentId,
  getPaymentForReservation,
  getReservationById,
  updatePayment,
  updateReservationStatus,
} from "@/lib/padel/data";

function getPaymentIdFromPayload(
  payload: unknown,
  searchParams: URLSearchParams,
) {
  const queryId = searchParams.get("data.id") ?? searchParams.get("id");

  if (queryId) {
    return queryId;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const data = body.data;

  if (data && typeof data === "object") {
    const id = (data as Record<string, unknown>).id;

    if (typeof id === "string" || typeof id === "number") {
      return String(id);
    }
  }

  return null;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const paymentId = getPaymentIdFromPayload(
    payload,
    new URL(request.url).searchParams,
  );

  if (!paymentId) {
    return NextResponse.json({ ok: true });
  }

  const [{ token }, mercadoPagoPayment] = await Promise.all([
    authenticatePocketBaseAdmin(),
    getMercadoPagoPayment(paymentId),
  ]);

  if (!mercadoPagoPayment.reservationId) {
    return NextResponse.json({ ok: true });
  }

  const reservation = await getReservationById(
    token,
    mercadoPagoPayment.reservationId,
  );

  if (!reservation) {
    return NextResponse.json({ ok: true });
  }

  const existingPayment =
    (await getPaymentByProviderPaymentId(token, mercadoPagoPayment.id)) ??
    (await getPaymentForReservation(token, reservation.id));
  const nextStatus =
    mercadoPagoPayment.status === "approved" &&
    reservation.status === "expired"
      ? "review_required"
      : mercadoPagoPayment.status;
  const paymentInput = {
    providerPreferenceId: mercadoPagoPayment.preferenceId,
    providerPaymentId: mercadoPagoPayment.id,
    status: nextStatus,
    amount: mercadoPagoPayment.amount,
    rawWebhookData: mercadoPagoPayment.raw,
  };

  if (existingPayment) {
    await updatePayment(token, existingPayment.id, paymentInput);
  } else {
    await createPayment(token, {
      reservationId: reservation.id,
      ...paymentInput,
    });
  }

  if (
    mercadoPagoPayment.status === "approved" &&
    reservation.status === "pending_payment"
  ) {
    await updateReservationStatus(token, reservation.id, "confirmed");
  }

  return NextResponse.json({ ok: true });
}
