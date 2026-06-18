"use client";

import { useEffect, useMemo, useState } from "react";

import {
  TURN_DURATIONS,
  type ClubSettings,
  type Court,
} from "@/lib/domain/reservations";

type ReservationPickerProps = {
  courts: Court[];
  settings: ClubSettings | null;
};

type AvailabilitySlot = {
  courtId: string;
  courtName: string;
  startsAt: string;
  endsAt: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

export function ReservationPicker({ courts, settings }: ReservationPickerProps) {
  const [date, setDate] = useState(getTodayValue);
  const [duration, setDuration] = useState<(typeof TURN_DURATIONS)[number]>(90);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservationNotice, setReservationNotice] = useState<string | null>(
    null,
  );

  const dayLabel = useMemo(() => {
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(`${date}T12:00:00`));
  }, [date]);

  const slotsByCourt = useMemo(() => {
    return courts.map((court) => ({
      court,
      slots: slots.filter((slot) => slot.courtId === court.id),
    }));
  }, [courts, slots]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAvailability() {
      setIsLoading(true);
      setError(null);
      setSelectedSlot(null);
      setReservationNotice(null);

      try {
        const params = new URLSearchParams({
          date,
          duration: String(duration),
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
  }, [date, duration]);

  async function createReservation() {
    if (!selectedSlot) {
      return;
    }

    setIsCreating(true);
    setError(null);
    setReservationNotice(null);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courtId: selectedSlot.courtId,
          startsAt: selectedSlot.startsAt,
          durationMinutes: duration,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No pudimos crear la reserva.");
      }

      setReservationNotice(
        `Reserva pendiente creada. Tenes ${settings?.paymentHoldMinutes ?? 10} minutos para pagar la sena.`,
      );
      setSlots((currentSlots) =>
        currentSlots.filter(
          (slot) =>
            !(
              slot.courtId === selectedSlot.courtId &&
              slot.startsAt === selectedSlot.startsAt
            ),
        ),
      );
      setSelectedSlot(null);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "No pudimos crear la reserva.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="rounded-lg border border-[#d9ded5] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-[#26382f]">Buscar turno</h2>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium text-[#26382f]">
            Fecha
            <input
              type="date"
              value={date}
              min={getTodayValue()}
              onChange={(event) => setDate(event.target.value)}
              className="h-11 rounded-md border border-[#cbd3c9] bg-white px-3 text-base outline-none transition focus:border-[#164b35] focus:ring-2 focus:ring-[#cfe3d8]"
            />
          </label>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-[#26382f]">
              Duracion
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {TURN_DURATIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDuration(option)}
                  className={`h-11 rounded-md border text-sm font-semibold transition ${
                    duration === option
                      ? "border-[#164b35] bg-[#164b35] text-white"
                      : "border-[#cbd3c9] bg-white text-[#26382f] hover:border-[#8ea090]"
                  }`}
                >
                  {option} min
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <div className="rounded-lg border border-[#d9ded5] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium capitalize text-[#526158]">
              {dayLabel}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[#26382f]">
              Canchas disponibles
            </h2>
          </div>
          <div className="rounded-md bg-[#edf4ef] px-3 py-2 text-sm text-[#164b35]">
            Sena:{" "}
            <span className="font-semibold">
              {formatCurrency(settings?.depositAmount ?? 0)}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {isLoading ? (
            <p className="rounded-md border border-[#e2e6df] bg-[#f6f7f4] p-4 text-sm text-[#526158]">
              Cargando horarios...
            </p>
          ) : error ? (
            <p className="rounded-md border border-[#e7b8a4] bg-[#fff3ee] p-4 text-sm text-[#7b3f28]">
              {error}
            </p>
          ) : courts.length > 0 ? (
            slotsByCourt.map(({ court, slots: courtSlots }) => (
              <div
                key={court.id}
                className="rounded-md border border-[#e2e6df] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-[#26382f]">{court.name}</p>
                    <p className="mt-1 text-sm text-[#526158]">
                      Precio base {formatCurrency(settings?.basePrice ?? 0)} -{" "}
                      {duration} minutos
                    </p>
                  </div>
                  <span className="rounded-md bg-[#f6f7f4] px-3 py-2 text-sm font-medium text-[#526158]">
                    {courtSlots.length} horarios
                  </span>
                </div>

                {courtSlots.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                    {courtSlots.slice(0, 15).map((slot) => {
                      const isSelected =
                        selectedSlot?.courtId === slot.courtId &&
                        selectedSlot?.startsAt === slot.startsAt;

                      return (
                        <button
                          key={`${slot.courtId}-${slot.startsAt}`}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`h-10 rounded-md border text-sm font-semibold transition ${
                            isSelected
                              ? "border-[#164b35] bg-[#164b35] text-white"
                              : "border-[#cbd3c9] bg-white text-[#26382f] hover:border-[#8ea090]"
                          }`}
                        >
                          {new Intl.DateTimeFormat("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(slot.startsAt))}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 rounded-md bg-[#f6f7f4] p-3 text-sm text-[#526158]">
                    Sin horarios para esta duracion.
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="rounded-md border border-[#e2e6df] bg-[#f6f7f4] p-4 text-sm text-[#526158]">
              No hay canchas activas cargadas.
            </p>
          )}
        </div>

        {selectedSlot ? (
          <div className="mt-5 rounded-md border border-[#cfe3d8] bg-[#f4fbf7] p-4 text-sm text-[#164b35]">
            <p>
              Seleccionaste {selectedSlot.courtName} a las{" "}
              {new Intl.DateTimeFormat("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(selectedSlot.startsAt))}
              .
            </p>
            <button
              type="button"
              onClick={createReservation}
              disabled={isCreating}
              className="mt-3 h-11 rounded-md bg-[#164b35] px-4 text-sm font-semibold text-white transition hover:bg-[#0f3827] disabled:cursor-not-allowed disabled:bg-[#8ca397]"
            >
              {isCreating ? "Creando reserva..." : "Reservar con sena"}
            </button>
          </div>
        ) : null}

        {reservationNotice ? (
          <p className="mt-5 rounded-md border border-[#cfe3d8] bg-[#f4fbf7] p-4 text-sm font-medium text-[#164b35]">
            {reservationNotice}
          </p>
        ) : null}
      </div>
    </section>
  );
}
