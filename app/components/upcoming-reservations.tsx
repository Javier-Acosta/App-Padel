"use client";

import { useEffect, useMemo, useState } from "react";

import {
  cancelReservationAction,
  payReservationDepositAction,
  rescheduleReservationAction,
} from "@/app/reservas/actions";
import {
  MAX_TURN_DURATION_MINUTES,
  canUserCancelReservation,
  type Court,
  type Reservation,
  type ReservationStatus,
} from "@/lib/domain/reservations";

type UpcomingReservationsProps = {
  reservations: Reservation[];
  courts: Court[];
  cancellationCutoffHours: number;
};

type AvailabilitySlot = {
  courtId: string;
  courtName: string;
  startsAt: string;
  endsAt: string;
};

type SelectedRange = {
  courtId: string;
  courtName: string;
  startsAt: string;
  endsAt?: string;
};

const HALF_HOUR_MS = 30 * 60 * 1000;

const statusLabels: Record<ReservationStatus, string> = {
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmada",
  expired: "Expirada",
  cancelled_by_user: "Cancelada",
  cancelled_by_admin: "Cancelada por admin",
  completed: "Completada",
  no_show: "Ausente",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTimeRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const day = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(start);
  const startTime = `${start.getHours()}:${String(start.getMinutes()).padStart(2, "0")}`;
  const endTime = `${end.getHours()}:${String(end.getMinutes()).padStart(2, "0")}`;

  return `${day} de ${startTime} a ${endTime}`;
}

function getDateInputValue(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(value: string) {
  const date = new Date(value);

  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getTimeButtons(slots: AvailabilitySlot[]) {
  const times = new Set<string>();

  for (const slot of slots) {
    times.add(slot.startsAt);
    times.add(slot.endsAt);
  }

  return Array.from(times).sort(
    (left, right) => new Date(left).getTime() - new Date(right).getTime(),
  );
}

function isRangeAvailable(
  slots: AvailabilitySlot[],
  startsAt: string,
  endsAt: string,
) {
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();

  if (
    endMs - startMs < 60 * 60 * 1000 ||
    endMs - startMs > MAX_TURN_DURATION_MINUTES * 60 * 1000 ||
    (endMs - startMs) % HALF_HOUR_MS !== 0
  ) {
    return false;
  }

  for (
    let cursor = startMs;
    cursor <= endMs - 60 * 60 * 1000;
    cursor += HALF_HOUR_MS
  ) {
    const hasSlot = slots.some(
      (slot) =>
        new Date(slot.startsAt).getTime() === cursor &&
        new Date(slot.endsAt).getTime() === cursor + 60 * 60 * 1000,
    );

    if (!hasSlot) {
      return false;
    }
  }

  return true;
}

function ReschedulePicker({
  reservation,
  courts,
}: {
  reservation: Reservation;
  courts: Court[];
}) {
  const [courtId, setCourtId] = useState(reservation.courtId);
  const [date, setDate] = useState(getDateInputValue(reservation.startsAt));
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedRange, setSelectedRange] = useState<SelectedRange | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const courtSlots = useMemo(
    () => slots.filter((slot) => slot.courtId === courtId),
    [courtId, slots],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadAvailability() {
      setIsLoading(true);
      setError(null);
      setSelectedRange(null);

      try {
        const params = new URLSearchParams({
          date,
          duration: "60",
          excludeReservationId: reservation.id,
        });
        const response = await fetch(`/api/availability?${params}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "No pudimos cargar disponibilidad.");
        }

        setSlots(data.slots ?? []);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "No pudimos cargar disponibilidad.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadAvailability();

    return () => controller.abort();
  }, [date, reservation.id]);

  const durationMinutes = selectedRange?.endsAt
    ? (new Date(selectedRange.endsAt).getTime() -
        new Date(selectedRange.startsAt).getTime()) /
      (60 * 1000)
    : 0;
  const selectedHours = durationMinutes / 60;

  function selectTime(time: string) {
    const court = courts.find((item) => item.id === courtId);

    if (!court) {
      return;
    }

    setError(null);

    if (!selectedRange || selectedRange.courtId !== courtId) {
      setSelectedRange({
        courtId,
        courtName: court.name,
        startsAt: time,
      });
      return;
    }

    if (selectedRange.endsAt) {
      const startMs = new Date(selectedRange.startsAt).getTime();
      const clickedMs = new Date(time).getTime();

      if (clickedMs === startMs) {
        setSelectedRange({
          courtId,
          courtName: court.name,
          startsAt: time,
        });
        return;
      }

      const startsAt = clickedMs < startMs ? time : selectedRange.startsAt;
      const endsAt = clickedMs < startMs ? selectedRange.startsAt : time;

      if (!isRangeAvailable(courtSlots, startsAt, endsAt)) {
        setError("Elegi un rango de al menos 1 hora en bloques disponibles.");
        setSelectedRange({
          courtId,
          courtName: court.name,
          startsAt: time,
        });
        return;
      }

      setSelectedRange({
        courtId,
        courtName: court.name,
        startsAt,
        endsAt,
      });
      return;
    }

    if (selectedRange.startsAt === time) {
      setSelectedRange(null);
      return;
    }

    const startMs = new Date(selectedRange.startsAt).getTime();
    const clickedMs = new Date(time).getTime();
    const startsAt = clickedMs < startMs ? time : selectedRange.startsAt;
    const endsAt = clickedMs < startMs ? selectedRange.startsAt : time;

    if (!isRangeAvailable(courtSlots, startsAt, endsAt)) {
      setError("Elegi un rango de al menos 1 hora en bloques disponibles.");
      setSelectedRange({
        courtId,
        courtName: court.name,
        startsAt: time,
      });
      return;
    }

    setSelectedRange({
      courtId,
      courtName: court.name,
      startsAt,
      endsAt,
    });
  }

  return (
    <details className="mt-4 rounded-md bg-[#f6f7f4] p-4">
      <summary className="cursor-pointer text-sm font-semibold text-[#164b35]">
        Reprogramar turno
      </summary>
      <form action={rescheduleReservationAction} className="mt-4 grid gap-4">
        <input type="hidden" name="reservationId" value={reservation.id} />
        <input
          type="hidden"
          name="startsAt"
          value={selectedRange?.startsAt ?? ""}
        />
        <input type="hidden" name="durationMinutes" value={durationMinutes} />

        <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
          <label className="grid gap-1.5 text-sm font-medium text-[#26382f]">
            Cancha
            <select
              name="courtId"
              value={courtId}
              onChange={(event) => {
                setCourtId(event.target.value);
                setSelectedRange(null);
                setError(null);
              }}
              className="h-10 rounded-md border border-[#cbd3c9] bg-white px-3 text-sm outline-none transition focus:border-[#164b35] focus:ring-2 focus:ring-[#cfe3d8]"
            >
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-[#26382f]">
            Fecha
            <input
              type="date"
              name="date"
              min={getTodayValue()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-10 rounded-md border border-[#cbd3c9] bg-white px-3 text-sm outline-none transition focus:border-[#164b35] focus:ring-2 focus:ring-[#cfe3d8]"
            />
          </label>
        </div>

        {isLoading ? (
          <p className="rounded-md bg-white p-3 text-sm text-[#526158]">
            Buscando horarios...
          </p>
        ) : error ? (
          <p className="rounded-md border border-[#e7b8a4] bg-[#fff3ee] p-3 text-sm text-[#7b3f28]">
            {error}
          </p>
        ) : courtSlots.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {getTimeButtons(courtSlots).map((time) => {
              const selectedStartMs = selectedRange
                ? new Date(selectedRange.startsAt).getTime()
                : null;
              const selectedEndMs = selectedRange?.endsAt
                ? new Date(selectedRange.endsAt).getTime()
                : selectedStartMs;
              const timeMs = new Date(time).getTime();
              const isSelected =
                selectedRange?.courtId === courtId &&
                selectedStartMs !== null &&
                selectedEndMs !== null &&
                timeMs >= selectedStartMs &&
                timeMs <= selectedEndMs;

              return (
                <button
                  key={`${courtId}-${time}`}
                  type="button"
                  onClick={() => selectTime(time)}
                  className={`h-10 rounded-md border text-sm font-semibold transition ${
                    isSelected
                      ? "border-[#164b35] bg-[#164b35] text-white"
                      : "border-[#cbd3c9] bg-white text-[#26382f] hover:border-[#8ea090]"
                  }`}
                >
                  {formatTime(time)}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-md bg-white p-3 text-sm text-[#526158]">
            No hay horarios disponibles para esa cancha y fecha.
          </p>
        )}

        {selectedRange ? (
          <p className="rounded-md border border-[#cfe3d8] bg-[#f4fbf7] p-3 text-sm text-[#164b35]">
            {selectedRange.endsAt
              ? `Nuevo turno: ${selectedRange.courtName} de ${formatTime(
                  selectedRange.startsAt,
                )} a ${formatTime(selectedRange.endsAt)} (${selectedHours} ${
                  selectedHours === 1 ? "hora" : "horas"
                }).`
              : "Ahora elegi la hora de fin."}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!selectedRange?.endsAt}
          className="h-10 justify-self-start rounded-md bg-[#164b35] px-4 text-sm font-semibold text-white transition hover:bg-[#0f3827] disabled:cursor-not-allowed disabled:bg-[#8ca397]"
        >
          Guardar nuevo horario
        </button>
      </form>
    </details>
  );
}

export function UpcomingReservations({
  reservations,
  courts,
  cancellationCutoffHours,
}: UpcomingReservationsProps) {
  const courtNameById = new Map(courts.map((court) => [court.id, court.name]));

  return (
    <section className="mt-8 rounded-lg border border-[#d9ded5] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#26382f]">
            Mis proximos turnos
          </h2>
          <p className="mt-1 text-sm text-[#526158]">
            Revisa el estado de tus reservas, cancela o reprograma eligiendo un
            horario disponible.
          </p>
        </div>
        <span className="rounded-md bg-[#edf4ef] px-3 py-2 text-sm font-medium text-[#164b35]">
          Limite: {cancellationCutoffHours} h antes
        </span>
      </div>

      <div className="mt-5 grid gap-3">
        {reservations.length > 0 ? (
          reservations.map((reservation) => {
            const canChange = canUserCancelReservation(
              reservation,
              new Date(),
              cancellationCutoffHours,
            );

            return (
              <div
                key={reservation.id}
                className="rounded-md border border-[#e2e6df] p-4"
              >
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                  <div>
                    <p className="font-semibold text-[#26382f]">
                      {courtNameById.get(reservation.courtId) ?? "Cancha"}
                    </p>
                    <p className="mt-1 text-sm text-[#526158]">
                      {formatDateTimeRange(
                        reservation.startsAt,
                        reservation.endsAt,
                      )}
                    </p>
                  </div>
                  <div className="self-center text-sm">
                    <span className="rounded-md bg-[#f6f7f4] px-3 py-2 font-semibold text-[#526158]">
                      {statusLabels[reservation.status]}
                    </span>
                    <p className="mt-2 text-right text-[#526158]">
                      Sena {formatCurrency(reservation.depositAmount)}
                    </p>
                  </div>
                  {canChange ? (
                    <form action={cancelReservationAction} className="self-center">
                      <input
                        type="hidden"
                        name="reservationId"
                        value={reservation.id}
                      />
                      <button
                        type="submit"
                        className="h-10 rounded-md border border-[#d6b2a2] bg-white px-4 text-sm font-semibold text-[#7b3f28] transition hover:bg-[#fff3ee]"
                      >
                        Cancelar
                      </button>
                    </form>
                  ) : null}
                  {reservation.status === "pending_payment" ? (
                    <form
                      action={payReservationDepositAction}
                      className="self-center"
                    >
                      <input
                        type="hidden"
                        name="reservationId"
                        value={reservation.id}
                      />
                      <button
                        type="submit"
                        className="h-10 rounded-md bg-[#f6c46b] px-4 text-sm font-semibold text-[#10241b] transition hover:bg-[#ffd990]"
                      >
                        Pagar sena
                      </button>
                    </form>
                  ) : null}
                </div>

                {canChange ? (
                  <ReschedulePicker reservation={reservation} courts={courts} />
                ) : null}
              </div>
            );
          })
        ) : (
          <p className="rounded-md bg-[#f6f7f4] p-4 text-sm text-[#526158]">
            Todavia no tenes turnos proximos.
          </p>
        )}
      </div>
    </section>
  );
}
