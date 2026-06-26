import { getOptionalServerEnv } from "@/lib/env";
import type {
  PaymentStatus,
  Reservation,
  UserProfile,
} from "@/lib/domain/reservations";

type MercadoPagoPreferenceResponse = {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
};

type MercadoPagoPaymentResponse = {
  id: number;
  status: string;
  transaction_amount: number;
  external_reference?: string;
  preference_id?: string;
  metadata?: Record<string, unknown>;
};

function getMercadoPagoAccessToken() {
  const { MERCADOPAGO_ACCESS_TOKEN } = getOptionalServerEnv();

  if (!MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error("Missing MERCADOPAGO_ACCESS_TOKEN.");
  }

  return MERCADOPAGO_ACCESS_TOKEN;
}

function getAppUrl() {
  const { NEXT_PUBLIC_APP_URL } = getOptionalServerEnv();

  if (!NEXT_PUBLIC_APP_URL) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL.");
  }

  return NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}

function mapMercadoPagoStatus(status: string): PaymentStatus {
  if (status === "approved") {
    return "approved";
  }

  if (status === "rejected") {
    return "rejected";
  }

  if (status === "cancelled") {
    return "cancelled";
  }

  if (status === "refunded") {
    return "refunded";
  }

  return "pending";
}

async function mercadoPagoRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  const payload = (await response.json()) as T;

  if (!response.ok) {
    throw new Error(`Mercado Pago request failed (${response.status}).`);
  }

  return payload;
}

export async function createReservationDepositPreference({
  reservation,
  user,
}: {
  reservation: Reservation;
  user: Pick<UserProfile, "name" | "email">;
}) {
  const appUrl = getAppUrl();
  const preference = await mercadoPagoRequest<MercadoPagoPreferenceResponse>(
    "/checkout/preferences",
    {
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            id: reservation.id,
            title: "Seña reserva AppPadel",
            description: `Reserva ${reservation.reservationDate}`,
            quantity: 1,
            currency_id: "ARS",
            unit_price: reservation.depositAmount,
          },
        ],
        payer: {
          name: user.name,
          email: user.email,
        },
        external_reference: reservation.id,
        metadata: {
          reservation_id: reservation.id,
        },
        back_urls: {
          success: `${appUrl}/reservas?payment=success`,
          pending: `${appUrl}/reservas?payment=pending`,
          failure: `${appUrl}/reservas?payment=failure`,
        },
        notification_url: `${appUrl}/api/payments/mercadopago/webhook`,
      }),
    },
  );

  return {
    id: preference.id,
    checkoutUrl: preference.init_point ?? preference.sandbox_init_point,
  };
}

export async function getMercadoPagoPayment(paymentId: string) {
  const payment = await mercadoPagoRequest<MercadoPagoPaymentResponse>(
    `/v1/payments/${paymentId}`,
  );
  const metadataReservationId = payment.metadata?.reservation_id;

  return {
    id: String(payment.id),
    status: mapMercadoPagoStatus(payment.status),
    amount: payment.transaction_amount,
    reservationId:
      payment.external_reference ??
      (typeof metadataReservationId === "string"
        ? metadataReservationId
        : undefined),
    preferenceId: payment.preference_id,
    raw: payment,
  };
}
