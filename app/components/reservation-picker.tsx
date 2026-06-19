"use client";

import { useEffect, useMemo, useState } from "react";

import {
  MAX_TURN_DURATION_MINUTES,
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

type SelectedRange = {
  courtId: string;
  courtName: string;
  startsAt: string;
  endsAt?: string;
};

const HALF_HOUR_MS = 30 * 60 * 1000;

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

function doSlotsOverlap(
  first: Pick<AvailabilitySlot, "startsAt" | "endsAt">,
  second: Pick<AvailabilitySlot, "startsAt" | "endsAt">,
) {
  return (
    new Date(first.startsAt).getTime() < new Date(second.endsAt).getTime() &&
    new Date(second.startsAt).getTime() < new Date(first.endsAt).getTime()
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
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

export function ReservationPicker({ courts, settings }: ReservationPickerProps) {
  const [date, setDate] = useState(getTodayValue);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedRange, setSelectedRange] = useState<SelectedRange | null>(
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
      setSelectedRange(null);
      setReservationNotice(null);

      try {
        const params = new URLSearchParams({
          date,
          duration: "60",
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
  }, [date]);

  const durationMinutes = selectedRange?.endsAt
    ? (new Date(selectedRange.endsAt).getTime() -
        new Date(selectedRange.startsAt).getTime()) /
      (60 * 1000)
    : 0;
  const selectedHours = durationMinutes / 60;
  const estimatedPrice = (settings?.basePrice ?? 0) * selectedHours;

  function selectTime(
    court: Court,
    courtSlots: AvailabilitySlot[],
    time: string,
  ) {
    setError(null);
    setReservationNotice(null);

    if (
      !selectedRange ||
      selectedRange.courtId !== court.id
    ) {
      setSelectedRange({
        courtId: court.id,
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
          courtId: court.id,
          courtName: court.name,
          startsAt: time,
        });
        return;
      }

      const startsAt = clickedMs < startMs ? time : selectedRange.startsAt;
      const endsAt = clickedMs < startMs ? selectedRange.startsAt : time;

      if (!isRangeAvailable(courtSlots, startsAt, endsAt)) {
        setError("Elegí un rango de al menos 1 hora en bloques de 30 minutos disponibles.");
        setSelectedRange({
          courtId: court.id,
          courtName: court.name,
          startsAt: time,
        });
        return;
      }

      setSelectedRange({
        courtId: court.id,
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
      setError("Elegí un rango de al menos 1 hora en bloques de 30 minutos disponibles.");
      setSelectedRange({
        courtId: court.id,
        courtName: court.name,
        startsAt: time,
      });
      return;
    }

    setSelectedRange({
      courtId: court.id,
      courtName: court.name,
      startsAt,
      endsAt,
    });
  }

  async function createReservation() {
    if (!selectedRange?.endsAt || durationMinutes <= 0) {
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
          courtId: selectedRange.courtId,
          date,
          startsAt: selectedRange.startsAt,
          durationMinutes,
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
            slot.courtId !== selectedRange.courtId ||
            !doSlotsOverlap(slot, {
              startsAt: selectedRange.startsAt,
              endsAt: selectedRange.endsAt!,
            }),
        ),
      );
      setSelectedRange(null);
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

          <p className="rounded-md bg-[#f6f7f4] p-3 text-sm leading-6 text-[#526158]">
            Selecciona una hora de inicio y una hora de fin en la cancha que
            quieras reservar.
          </p>
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
                      {formatCurrency(settings?.basePrice ?? 0)} por hora
                    </p>
                  </div>
                  <span className="rounded-md bg-[#f6f7f4] px-3 py-2 text-sm font-medium text-[#526158]">
                    {courtSlots.length} horarios
                  </span>
                </div>

                {courtSlots.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                    {getTimeButtons(courtSlots).map((time) => {
                      const selectedStartMs = selectedRange
                        ? new Date(selectedRange.startsAt).getTime()
                        : null;
                      const selectedEndMs = selectedRange?.endsAt
                        ? new Date(selectedRange.endsAt).getTime()
                        : selectedStartMs;
                      const timeMs = new Date(time).getTime();
                      const isSelected =
                        selectedRange?.courtId === court.id &&
                        selectedStartMs !== null &&
                        selectedEndMs !== null &&
                        timeMs >= selectedStartMs &&
                        timeMs <= selectedEndMs;

                      return (
                        <button
                          key={`${court.id}-${time}`}
                          type="button"
                          disabled={isCreating}
                          onClick={() => selectTime(court, courtSlots, time)}
                          className={`h-10 rounded-md border text-sm font-semibold transition ${
                            isSelected
                              ? "border-[#164b35] bg-[#164b35] text-white"
                              : "border-[#cbd3c9] bg-white text-[#26382f] hover:border-[#8ea090] disabled:cursor-not-allowed disabled:opacity-55"
                          }`}
                        >
                          {formatTime(time)}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 rounded-md bg-[#f6f7f4] p-3 text-sm text-[#526158]">
                    Sin horarios disponibles.
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

        {selectedRange ? (
          <div className="mt-5 rounded-md border border-[#cfe3d8] bg-[#f4fbf7] p-4 text-sm text-[#164b35]">
            <p>
              Seleccionaste {selectedRange.courtName} desde{" "}
              {formatTime(selectedRange.startsAt)}
              {selectedRange.endsAt
                ? ` hasta ${formatTime(selectedRange.endsAt)} (${selectedHours} ${
                    selectedHours === 1 ? "hora" : "horas"
                  }, ${formatCurrency(estimatedPrice)})`
                : ". Ahora elegi la hora de fin."}
            </p>
            {selectedRange.endsAt ? (
              <button
                type="button"
                onClick={createReservation}
                disabled={isCreating}
                className="mt-3 h-11 rounded-md bg-[#164b35] px-4 text-sm font-semibold text-white transition hover:bg-[#0f3827] disabled:cursor-not-allowed disabled:bg-[#8ca397]"
              >
                {isCreating ? "Creando reserva..." : "Reservar con sena"}
              </button>
            ) : null}
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
