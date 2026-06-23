"use client";

import { useEffect, useMemo, useState } from "react";

import {
  MAX_TURN_DURATION_MINUTES,
  type ClubSettings,
  type Court,
} from "@/lib/domain/reservations";
import {
  addClubDays,
  formatClubTime,
  getClubDateValue,
  toClubDateTime,
} from "@/lib/padel/timezone";

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

function formatDuration(minutes: number) {
  if (minutes <= 0) {
    return "Pendiente";
  }

  const hours = minutes / 60;

  return `${hours} ${hours === 1 ? "hora" : "horas"}`;
}

function getTodayValue() {
  return getClubDateValue();
}

function addDaysToDateValue(value: string, days: number) {
  return addClubDays(value, days);
}

function formatDayChip(value: string) {
  const date = toClubDateTime(value, "12:00");

  return {
    weekday: new Intl.DateTimeFormat("es-AR", {
      weekday: "short",
    }).format(date),
    day: new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
    }).format(date),
  };
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
  return formatClubTime(value);
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
      timeZone: "America/Argentina/Buenos_Aires",
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(toClubDateTime(date, "12:00"));
  }, [date]);

  const quickDates = useMemo(() => {
    const today = getTodayValue();

    return Array.from({ length: 7 }, (_, index) => {
      const value = addDaysToDateValue(today, index);

      return {
        value,
        ...formatDayChip(value),
      };
    });
  }, []);

  const slotsByCourt = useMemo(() => {
    return courts.map((court) => {
      const courtSlots = slots.filter((slot) => slot.courtId === court.id);

      return {
        court,
        slots: courtSlots,
        timeButtons: getTimeButtons(courtSlots),
      };
    });
  }, [courts, slots]);

  const allTimeButtons = useMemo(() => getTimeButtons(slots), [slots]);

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
  const hasCompleteSelection = Boolean(selectedRange?.endsAt);
  const selectedTimeLabel = selectedRange
    ? selectedRange.endsAt
      ? `${formatTime(selectedRange.startsAt)} a ${formatTime(selectedRange.endsAt)}`
      : `${formatTime(selectedRange.startsAt)} - elegi fin`
    : "Sin seleccionar";

  function selectTime(
    court: Court,
    courtSlots: AvailabilitySlot[],
    time: string,
  ) {
    setError(null);
    setReservationNotice(null);

    if (!selectedRange || selectedRange.courtId !== court.id) {
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
        setError(
          "Elegi un rango de al menos 1 hora en bloques de 30 minutos disponibles.",
        );
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
      setError(
        "Elegi un rango de al menos 1 hora en bloques de 30 minutos disponibles.",
      );
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
    <section className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
      <aside className="self-start rounded-lg border border-[#d9ded5] bg-white p-5 shadow-sm lg:sticky lg:top-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7b3f28]">
              Paso 1
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#26382f]">
              Armar reserva
            </h2>
          </div>
          <span className="rounded-md bg-[#edf4ef] px-3 py-2 text-sm font-semibold text-[#164b35]">
            {hasCompleteSelection ? "Lista" : "En curso"}
          </span>
        </div>

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

          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-4">
            {quickDates.map((item, index) => {
              const isActive = date === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setDate(item.value)}
                  className={`min-h-14 rounded-md border px-2 py-2 text-center text-sm transition ${
                    isActive
                      ? "border-[#164b35] bg-[#164b35] text-white"
                      : "border-[#cbd3c9] bg-white text-[#26382f] hover:border-[#8ea090]"
                  }`}
                >
                  <span className="block text-xs font-medium capitalize opacity-80">
                    {index === 0
                      ? "Hoy"
                      : index === 1
                        ? "Manana"
                        : item.weekday}
                  </span>
                  <span className="mt-1 block font-semibold">{item.day}</span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 rounded-md bg-[#f6f7f4] p-4 text-sm text-[#526158]">
            {[
              ["Cancha", selectedRange?.courtName ?? "Sin seleccionar"],
              ["Horario", selectedTimeLabel],
              ["Duracion", formatDuration(durationMinutes)],
              [
                "Total",
                hasCompleteSelection ? formatCurrency(estimatedPrice) : "Pendiente",
              ],
              ["Sena", formatCurrency(settings?.depositAmount ?? 0)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <span>{label}</span>
                <span className="text-right font-semibold text-[#26382f]">
                  {value}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={createReservation}
            disabled={!hasCompleteSelection || isCreating}
            className="h-11 rounded-md bg-[#164b35] px-4 text-sm font-semibold text-white transition hover:bg-[#0f3827] disabled:cursor-not-allowed disabled:bg-[#9aa9a0]"
          >
            {isCreating ? "Creando reserva..." : "Reservar con sena"}
          </button>

          <p className="text-sm leading-6 text-[#526158]">
            Toca una hora de inicio y despues la hora de fin en la misma cancha.
          </p>
        </div>
      </aside>

      <div className="rounded-lg border border-[#d9ded5] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7b3f28]">
              Paso 2
            </p>
            <p className="mt-2 text-sm font-medium capitalize text-[#526158]">
              {dayLabel}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[#26382f]">
              Canchas disponibles
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:min-w-64">
            <div className="rounded-md bg-[#edf4ef] px-3 py-2 text-[#164b35]">
              <p className="font-medium">Sena</p>
              <p className="font-semibold">
                {formatCurrency(settings?.depositAmount ?? 0)}
              </p>
            </div>
            <div className="rounded-md bg-[#f6f7f4] px-3 py-2 text-[#526158]">
              <p className="font-medium">Precio hora</p>
              <p className="font-semibold text-[#26382f]">
                {formatCurrency(settings?.basePrice ?? 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {isLoading ? (
            <div className="grid gap-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-32 animate-pulse rounded-md border border-[#e2e6df] bg-[#f6f7f4]"
                />
              ))}
            </div>
          ) : error ? (
            <p className="rounded-md border border-[#e7b8a4] bg-[#fff3ee] p-4 text-sm text-[#7b3f28]">
              {error}
            </p>
          ) : courts.length > 0 && allTimeButtons.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-[#e2e6df]">
              <div className="overflow-x-auto">
                <div
                  className="min-w-[720px] bg-white"
                  style={{
                    gridTemplateColumns: `92px repeat(${courts.length}, minmax(132px, 1fr))`,
                  }}
                >
                  <div
                    className="grid border-b border-[#e2e6df] bg-[#f6f7f4]"
                    style={{
                      gridTemplateColumns: `92px repeat(${courts.length}, minmax(132px, 1fr))`,
                    }}
                  >
                    <div className="sticky left-0 z-10 border-r border-[#e2e6df] bg-[#f6f7f4] px-3 py-3 text-sm font-semibold text-[#526158]">
                      Hora
                    </div>
                    {slotsByCourt.map(({ court, slots: courtSlots }) => (
                      <div
                        key={court.id}
                        className={`border-r border-[#e2e6df] px-3 py-3 text-sm font-semibold text-[#26382f] last:border-r-0 ${
                          selectedRange?.courtId === court.id
                            ? "bg-[#edf8f1]"
                            : ""
                        }`}
                      >
                        <span>{court.name}</span>
                        <span className="mt-1 block text-xs font-medium text-[#526158]">
                          {courtSlots.length} bloques
                        </span>
                      </div>
                    ))}
                  </div>

                  {allTimeButtons.map((time) => (
                    <div
                      key={time}
                      className="grid border-b border-[#edf0ea] last:border-b-0"
                      style={{
                        gridTemplateColumns: `92px repeat(${courts.length}, minmax(132px, 1fr))`,
                      }}
                    >
                      <div className="sticky left-0 z-10 border-r border-[#e2e6df] bg-white px-3 py-2 text-sm font-semibold text-[#526158]">
                        {formatTime(time)}
                      </div>
                      {slotsByCourt.map(({ court, slots: courtSlots, timeButtons }) => {
                        const hasCourtTime = timeButtons.includes(time);
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
                        const isRangeEdge =
                          selectedRange?.courtId === court.id &&
                          (timeMs === selectedStartMs ||
                            timeMs === selectedEndMs);

                        return (
                          <div
                            key={`${court.id}-${time}`}
                            className={`border-r border-[#edf0ea] p-2 last:border-r-0 ${
                              selectedRange?.courtId === court.id
                                ? "bg-[#fbfffc]"
                                : ""
                            }`}
                          >
                            {hasCourtTime ? (
                              <button
                                type="button"
                                disabled={isCreating}
                                onClick={() =>
                                  selectTime(court, courtSlots, time)
                                }
                                className={`h-10 w-full rounded-md border text-sm font-semibold transition ${
                                  isSelected
                                    ? isRangeEdge
                                      ? "border-[#164b35] bg-[#164b35] text-white"
                                      : "border-[#a9cfb8] bg-[#edf8f1] text-[#164b35]"
                                    : "border-[#cbd3c9] bg-white text-[#26382f] hover:border-[#8ea090] disabled:cursor-not-allowed disabled:opacity-55"
                                }`}
                              >
                                {isSelected ? "Seleccionado" : "Libre"}
                              </button>
                            ) : (
                              <div className="flex h-10 items-center justify-center rounded-md bg-[#f6f7f4] text-sm text-[#9aa59d]">
                                -
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-[#e2e6df] bg-[#f6f7f4] p-4 text-sm text-[#526158]">
              {courts.length > 0
                ? "No hay horarios disponibles para esta fecha."
                : "No hay canchas activas cargadas."}
            </p>
          )}
        </div>

        {selectedRange ? (
          <div className="mt-5 rounded-md border border-[#cfe3d8] bg-[#f4fbf7] p-4 text-sm text-[#164b35]">
            <p className="font-semibold">
              {hasCompleteSelection
                ? "Paso 3: confirma la sena"
                : "Falta elegir la hora de fin"}
            </p>
            <p className="mt-1 text-[#35624c]">
              {selectedRange.courtName} - {selectedTimeLabel}
              {hasCompleteSelection
                ? ` - ${formatDuration(durationMinutes)} - ${formatCurrency(estimatedPrice)}`
                : ""}
            </p>
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
