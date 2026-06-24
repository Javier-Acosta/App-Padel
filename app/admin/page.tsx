import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createCourtAction,
  createCourtBlockAction,
  createPromotionAction,
  deleteCourtBlockAction,
  deletePromotionAction,
  updateCourtAction,
  updatePromotionAction,
  updateReservationStatusAction,
  updateSettingsAction,
} from "@/app/admin/actions";
import { LogoutButton } from "@/app/components/logout-button";
import { getAuthToken, getCurrentUser } from "@/lib/auth/session";
import type {
  ClubSettings,
  Court,
  Promotion,
  ReservationStatus,
} from "@/lib/domain/reservations";
import { isReservationStatus } from "@/lib/domain/reservations";
import { authenticatePocketBaseAdmin } from "@/lib/pocketbase/client";
import {
  getAllCourts,
  getClubSettingsRecord,
  getPromotions,
  getUserProfilesByIds,
  getUpcomingReservations,
  getUpcomingCourtBlocks,
} from "@/lib/padel/data";
import {
  CLUB_OPENING_END,
  CLUB_OPENING_START,
  createDefaultOpeningHours,
} from "@/lib/padel/opening-hours";
import {
  formatClubTime,
  getClubDateValue,
} from "@/lib/padel/timezone";

const dayLabels = [
  ["monday", "Lunes"],
  ["tuesday", "Martes"],
  ["wednesday", "Miercoles"],
  ["thursday", "Jueves"],
  ["friday", "Viernes"],
  ["saturday", "Sabado"],
  ["sunday", "Domingo"],
] as const;

const promotionDayLabels = [
  [1, "Lun"],
  [2, "Mar"],
  [3, "Mie"],
  [4, "Jue"],
  [5, "Vie"],
  [6, "Sab"],
  [0, "Dom"],
] as const;

const defaultSettings: ClubSettings = {
  openingHours: createDefaultOpeningHours(),
  basePrice: 12000,
  depositAmount: 3000,
  paymentHoldMinutes: 10,
  cancellationCutoffHours: 3,
};

const statusLabels: Record<ReservationStatus, string> = {
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmada",
  expired: "Expirada",
  cancelled_by_user: "Cancelada por usuario",
  cancelled_by_admin: "Cancelada por admin",
  completed: "Completada",
  no_show: "Ausente",
};

const adminStatusActions = [
  ["confirmed", "Confirmar"],
  ["cancelled_by_admin", "Cancelar"],
  ["completed", "Completada"],
  ["no_show", "Ausente"],
] as const satisfies ReadonlyArray<readonly [ReservationStatus, string]>;

const filterStatusOptions = [
  ["", "Todos"],
  ["pending_payment", "Pendiente de pago"],
  ["confirmed", "Confirmadas"],
  ["cancelled_by_user", "Canceladas por usuario"],
  ["cancelled_by_admin", "Canceladas por admin"],
  ["completed", "Completadas"],
  ["no_show", "Ausentes"],
] as const;

function formatDateTime(value: string) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

  return `${day} ${formatClubTime(date)}`;
}

function formatDateTimeRange(startsAt: string, endsAt: string) {
  return `${formatDateTime(startsAt)} hasta ${formatDateTime(endsAt)}`;
}

function formatTimeRange(startsAt: string, endsAt: string) {
  return `${formatClubTime(startsAt)} a ${formatClubTime(endsAt)}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function getTodayValue() {
  return getClubDateValue();
}

function getDateInputValue(value: string) {
  return getClubDateValue(value);
}

function formatDateValue(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function statusBadgeClassName(status: ReservationStatus) {
  if (status === "confirmed") {
    return "bg-[#edf4ef] text-[#164b35]";
  }

  if (status === "pending_payment") {
    return "bg-[#fff7e4] text-[#7b4d09]";
  }

  if (status === "cancelled_by_admin" || status === "cancelled_by_user") {
    return "bg-[#fff3ee] text-[#7b3f28]";
  }

  return "bg-[#f6f7f4] text-[#526158]";
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-[#26382f]">
      {label}
      {children}
    </label>
  );
}

function textInputClassName(extra = "") {
  return `h-10 rounded-md border border-[#cbd3c9] bg-white px-3 text-sm outline-none transition focus:border-[#164b35] focus:ring-2 focus:ring-[#cfe3d8] ${extra}`;
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="h-10 rounded-md bg-[#164b35] px-4 text-sm font-semibold text-white transition hover:bg-[#0f3827]"
    >
      {children}
    </button>
  );
}

function CourtForm({ court }: { court: Court }) {
  return (
    <form
      action={updateCourtAction}
      className="grid gap-3 rounded-md border border-[#e2e6df] p-4 md:grid-cols-[1fr_auto_auto]"
    >
      <input type="hidden" name="id" value={court.id} />
      <Field label="Nombre">
        <input
          name="name"
          defaultValue={court.name}
          required
          className={textInputClassName()}
        />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-[#26382f]">
        <input
          type="checkbox"
          name="active"
          defaultChecked={court.active}
          className="size-4 accent-[#164b35]"
        />
        Activa
      </label>
      <div className="self-end">
        <SubmitButton>Guardar</SubmitButton>
      </div>
    </form>
  );
}

function PromotionForm({ promotion }: { promotion?: Promotion }) {
  return (
    <form
      action={promotion ? updatePromotionAction : createPromotionAction}
      className="grid gap-4 rounded-md border border-[#e2e6df] p-4"
    >
      {promotion ? <input type="hidden" name="id" value={promotion.id} /> : null}
      <div className="grid gap-3 lg:grid-cols-[1fr_150px_150px_auto]">
        <Field label="Nombre">
          <input
            name="name"
            defaultValue={promotion?.name}
            placeholder="Promo tarde"
            required
            className={textInputClassName()}
          />
        </Field>
        <Field label="Desde">
          <input
            type="date"
            name="startsAt"
            defaultValue={
              promotion ? getDateInputValue(promotion.startsAt) : getTodayValue()
            }
            required
            className={textInputClassName()}
          />
        </Field>
        <Field label="Hasta">
          <input
            type="date"
            name="endsAt"
            defaultValue={
              promotion ? getDateInputValue(promotion.endsAt) : getTodayValue()
            }
            required
            className={textInputClassName()}
          />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-[#26382f]">
          <input
            type="checkbox"
            name="active"
            defaultChecked={promotion?.active ?? true}
            className="size-4 accent-[#164b35]"
          />
          Activa
        </label>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_140px_140px_140px_140px]">
        <div>
          <p className="text-sm font-medium text-[#26382f]">Dias</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {promotionDayLabels.map(([value, label]) => (
              <label
                key={value}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cbd3c9] bg-white px-3 text-sm font-semibold text-[#26382f]"
              >
                <input
                  type="checkbox"
                  name="daysOfWeek"
                  value={value}
                  defaultChecked={
                    promotion ? promotion.daysOfWeek.includes(value) : true
                  }
                  className="size-4 accent-[#164b35]"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <Field label="Hora desde">
          <input
            type="time"
            name="timeRange.startsAt"
            defaultValue={promotion?.timeRange?.startsAt ?? ""}
            className={textInputClassName()}
          />
        </Field>
        <Field label="Hora hasta">
          <input
            type="time"
            name="timeRange.endsAt"
            defaultValue={promotion?.timeRange?.endsAt ?? ""}
            className={textInputClassName()}
          />
        </Field>
        <Field label="Precio promo">
          <input
            type="number"
            name="priceOverride"
            min="0"
            defaultValue={promotion?.priceOverride ?? ""}
            className={textInputClassName()}
          />
        </Field>
        <Field label="Sena promo">
          <input
            type="number"
            name="depositOverride"
            min="0"
            defaultValue={promotion?.depositOverride ?? ""}
            className={textInputClassName()}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <SubmitButton>{promotion ? "Guardar promocion" : "Crear promocion"}</SubmitButton>
        {promotion ? (
          <button
            formAction={deletePromotionAction}
            type="submit"
            className="h-10 rounded-md border border-[#d6b2a2] bg-white px-4 text-sm font-semibold text-[#7b3f28] transition hover:bg-[#fff3ee]"
          >
            Eliminar
          </button>
        ) : null}
      </div>
    </form>
  );
}

function getSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, token] = await Promise.all([getCurrentUser(), getAuthToken()]);

  if (!user || !token) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/reservas");
  }

  const adminAuth = await authenticatePocketBaseAdmin();
  const adminToken = adminAuth.token;
  const resolvedSearchParams = await searchParams;
  const statusParam = getSearchParam(resolvedSearchParams, "status");
  const courtIdParam = getSearchParam(resolvedSearchParams, "courtId");
  const dateParam = getSearchParam(resolvedSearchParams, "date");
  const reservationFilters = {
    ...(statusParam && isReservationStatus(statusParam)
      ? { status: statusParam }
      : {}),
    ...(courtIdParam ? { courtId: courtIdParam } : {}),
    ...(dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? { date: dateParam }
      : {}),
  };

  const [courts, settingsRecord, blocks, reservations, promotions] =
    await Promise.all([
      getAllCourts(adminToken),
      getClubSettingsRecord(adminToken),
      getUpcomingCourtBlocks(adminToken),
      getUpcomingReservations(adminToken, reservationFilters),
      getPromotions(adminToken),
    ]);
  const reservationUsers = await getUserProfilesByIds(
    adminToken,
    reservations.map((reservation) => reservation.userId),
  );
  const settings = settingsRecord?.settings ?? defaultSettings;
  const courtNameById = new Map(courts.map((court) => [court.id, court.name]));
  const userById = new Map(reservationUsers.map((item) => [item.id, item]));
  const selectedDate = reservationFilters.date ?? getTodayValue();
  const reservationsForSelectedDate = reservations.filter(
    (reservation) => getDateInputValue(reservation.startsAt) === selectedDate,
  );
  const blocksForSelectedDate = blocks.filter(
    (block) => getDateInputValue(block.startsAt) === selectedDate,
  );
  const selectedDateStats = [
    {
      label: "Turnos",
      value: reservationsForSelectedDate.length,
    },
    {
      label: "Confirmadas",
      value: reservationsForSelectedDate.filter(
        (reservation) => reservation.status === "confirmed",
      ).length,
    },
    {
      label: "Pendientes",
      value: reservationsForSelectedDate.filter(
        (reservation) => reservation.status === "pending_payment",
      ).length,
    },
    {
      label: "Ingresos",
      value: formatCurrency(
        reservationsForSelectedDate
          .filter((reservation) => reservation.status === "confirmed")
          .reduce((total, reservation) => total + reservation.totalPrice, 0),
      ),
    },
  ];
  const blockStats = [
    {
      label: "Bloqueos del dia",
      value: blocksForSelectedDate.length,
    },
    {
      label: "Canchas afectadas",
      value: new Set(blocksForSelectedDate.map((block) => block.courtId)).size,
    },
    {
      label: "Proximos bloqueos",
      value: blocks.length,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f6f7f4] px-6 py-8 text-[#1b241f]">
      <div className="mx-auto w-full max-w-6xl">
        <nav className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-lg font-semibold">
            AppPadel
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/reservas"
              className="rounded-md border border-[#cbd3c9] bg-white px-4 py-2 text-sm font-semibold text-[#26382f]"
            >
              Ver reservas
            </Link>
            <LogoutButton />
          </div>
        </nav>

        <section className="mt-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7b3f28]">
            Administracion
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Panel del club</h1>
          <p className="mt-3 max-w-2xl text-[#526158]">
            Gestiona canchas, horarios generales, precios, senas y bloqueos de
            disponibilidad.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Canchas", courts.length],
            ["Activas", courts.filter((court) => court.active).length],
            ["Precio/hora", formatCurrency(settings.basePrice)],
            ["Sena", formatCurrency(settings.depositAmount)],
          ].map(([title, value]) => (
            <div
              key={title}
              className="rounded-lg border border-[#d9ded5] bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-[#526158]">{title}</p>
              <p className="mt-2 text-xl font-semibold text-[#26382f]">
                {value}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-[#d9ded5] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7b3f28]">
                Operacion
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#26382f]">
                Agenda del dia
              </h2>
              <p className="mt-1 text-sm text-[#526158]">
                Vista rapida de turnos, pagos pendientes y asistencia.
              </p>
            </div>
            <form className="grid gap-3 sm:grid-cols-[180px_auto]">
              <Field label="Fecha">
                <input
                  type="date"
                  name="date"
                  defaultValue={selectedDate}
                  className={textInputClassName()}
                />
              </Field>
              <div className="self-end">
                <SubmitButton>Ver dia</SubmitButton>
              </div>
            </form>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {selectedDateStats.map((item) => (
              <div key={item.label} className="rounded-md bg-[#f6f7f4] p-4">
                <p className="text-sm font-medium text-[#526158]">
                  {item.label}
                </p>
                <p className="mt-2 text-lg font-semibold text-[#26382f]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3">
            {reservationsForSelectedDate.length > 0 ? (
              reservationsForSelectedDate.map((reservation) => {
                const reservationUser = userById.get(reservation.userId);

                return (
                  <div
                    key={reservation.id}
                    className="grid gap-3 rounded-md border border-[#e2e6df] p-4 lg:grid-cols-[120px_1fr_auto]"
                  >
                    <div>
                      <p className="text-lg font-semibold text-[#26382f]">
                        {formatTimeRange(
                          reservation.startsAt,
                          reservation.endsAt,
                        )}
                      </p>
                      <p className="mt-1 text-sm text-[#526158]">
                        {reservation.durationMinutes / 60} h
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#26382f]">
                        {courtNameById.get(reservation.courtId) ?? "Cancha"}
                      </p>
                      <p className="mt-1 text-sm text-[#526158]">
                        {reservationUser?.name ?? "Usuario"} -{" "}
                        {reservationUser?.phone ??
                          reservationUser?.email ??
                          reservation.userId}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                      <span
                        className={`rounded-md px-3 py-2 text-sm font-semibold ${statusBadgeClassName(
                          reservation.status,
                        )}`}
                      >
                        {statusLabels[reservation.status]}
                      </span>
                      <span className="rounded-md bg-[#f6f7f4] px-3 py-2 text-sm font-semibold text-[#526158]">
                        {formatCurrency(reservation.totalPrice)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="rounded-md bg-[#f6f7f4] p-4 text-sm text-[#526158]">
                No hay reservas para esta fecha.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-lg border border-[#d9ded5] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#26382f]">
                  Canchas
                </h2>
                <p className="mt-1 text-sm text-[#526158]">
                  Activa o desactiva canchas sin borrarlas del historial.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {courts.map((court) => (
                <CourtForm key={court.id} court={court} />
              ))}
            </div>

            <form
              action={createCourtAction}
              className="mt-5 grid gap-3 rounded-md bg-[#f6f7f4] p-4 md:grid-cols-[1fr_auto_auto]"
            >
              <Field label="Nueva cancha">
                <input
                  name="name"
                  placeholder="Cancha 4"
                  required
                  className={textInputClassName()}
                />
              </Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-[#26382f]">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked
                  className="size-4 accent-[#164b35]"
                />
                Activa
              </label>
              <div className="self-end">
                <SubmitButton>Crear</SubmitButton>
              </div>
            </form>
          </div>

          <div className="rounded-lg border border-[#d9ded5] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-[#26382f]">
              Configuracion
            </h2>
            <p className="mt-1 text-sm text-[#526158]">
              Valores usados para nuevas reservas.
            </p>

            <form action={updateSettingsAction} className="mt-5 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Precio por hora">
                  <input
                    type="number"
                    name="basePrice"
                    min="0"
                    defaultValue={settings.basePrice}
                    className={textInputClassName()}
                  />
                </Field>
                <Field label="Sena">
                  <input
                    type="number"
                    name="depositAmount"
                    min="0"
                    defaultValue={settings.depositAmount}
                    className={textInputClassName()}
                  />
                </Field>
                <Field label="Minutos para pagar">
                  <input
                    type="number"
                    name="paymentHoldMinutes"
                    min="1"
                    defaultValue={settings.paymentHoldMinutes}
                    className={textInputClassName()}
                  />
                </Field>
                <Field label="Horas limite cancelacion">
                  <input
                    type="number"
                    name="cancellationCutoffHours"
                    min="0"
                    defaultValue={settings.cancellationCutoffHours}
                    className={textInputClassName()}
                  />
                </Field>
              </div>

              <div className="grid gap-2">
                <p className="text-sm font-semibold text-[#26382f]">
                  Horarios por dia
                </p>
                {dayLabels.map(([dayKey, label]) => {
                  const day = settings.openingHours[dayKey];
                  const range = day?.ranges[0] ?? {
                    startsAt: CLUB_OPENING_START,
                    endsAt: CLUB_OPENING_END,
                  };

                  return (
                    <div
                      key={dayKey}
                      className="grid gap-2 rounded-md border border-[#e2e6df] p-3 sm:grid-cols-[90px_1fr_1fr_auto]"
                    >
                      <p className="self-center text-sm font-semibold text-[#26382f]">
                        {label}
                      </p>
                      <input
                        type="time"
                        name={`${dayKey}.startsAt`}
                        defaultValue={range.startsAt}
                        className={textInputClassName()}
                      />
                      <input
                        type="time"
                        name={`${dayKey}.endsAt`}
                        defaultValue={range.endsAt}
                        className={textInputClassName()}
                      />
                      <label className="flex items-center gap-2 text-sm font-medium text-[#526158]">
                        <input
                          type="checkbox"
                          name={`${dayKey}.closed`}
                          defaultChecked={day?.closed}
                          className="size-4 accent-[#164b35]"
                        />
                        Cerrado
                      </label>
                    </div>
                  );
                })}
              </div>

              <SubmitButton>Guardar configuracion</SubmitButton>
            </form>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-[#d9ded5] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7b3f28]">
                Precios
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#26382f]">
                Promociones
              </h2>
              <p className="mt-1 text-sm text-[#526158]">
                Define precios o senas especiales por fecha, dia y horario.
              </p>
            </div>
            <div className="rounded-md bg-[#f6f7f4] px-4 py-3 text-sm text-[#526158]">
              <span className="font-semibold text-[#26382f]">
                {promotions.filter((promotion) => promotion.active).length}
              </span>{" "}
              activas
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {promotions.length > 0 ? (
              promotions.map((promotion) => (
                <div key={promotion.id} className="grid gap-3">
                  <div className="rounded-md bg-[#f6f7f4] p-4 text-sm text-[#526158]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#26382f]">
                          {promotion.name}
                        </p>
                        <p className="mt-1">
                          {formatDateValue(promotion.startsAt)} a{" "}
                          {formatDateValue(promotion.endsAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-md px-3 py-2 font-semibold ${
                          promotion.active
                            ? "bg-[#edf4ef] text-[#164b35]"
                            : "bg-white text-[#526158]"
                        }`}
                      >
                        {promotion.active ? "Activa" : "Pausada"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {promotion.priceOverride !== undefined ? (
                        <span className="rounded-md bg-white px-3 py-2 font-semibold text-[#26382f]">
                          Precio: {formatCurrency(promotion.priceOverride)}
                        </span>
                      ) : null}
                      {promotion.depositOverride !== undefined ? (
                        <span className="rounded-md bg-white px-3 py-2 font-semibold text-[#26382f]">
                          Sena: {formatCurrency(promotion.depositOverride)}
                        </span>
                      ) : null}
                      {promotion.timeRange ? (
                        <span className="rounded-md bg-white px-3 py-2 font-semibold text-[#26382f]">
                          {promotion.timeRange.startsAt} a{" "}
                          {promotion.timeRange.endsAt}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <PromotionForm promotion={promotion} />
                </div>
              ))
            ) : (
              <p className="rounded-md bg-[#f6f7f4] p-4 text-sm text-[#526158]">
                No hay promociones cargadas.
              </p>
            )}
          </div>

          <div className="mt-5">
            <PromotionForm />
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-[#d9ded5] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-[#26382f]">
            Reservas proximas
          </h2>
          <p className="mt-1 text-sm text-[#526158]">
            Controla pagos, cancelaciones y asistencia desde el panel.
          </p>

          <form className="mt-5 grid gap-3 rounded-md bg-[#f6f7f4] p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
            <Field label="Estado">
              <select
                name="status"
                defaultValue={reservationFilters.status ?? ""}
                className={textInputClassName("appearance-none")}
              >
                {filterStatusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cancha">
              <select
                name="courtId"
                defaultValue={reservationFilters.courtId ?? ""}
                className={textInputClassName("appearance-none")}
              >
                <option value="">Todas</option>
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fecha">
              <input
                type="date"
                name="date"
                defaultValue={reservationFilters.date ?? ""}
                className={textInputClassName()}
              />
            </Field>
            <div className="flex gap-2 self-end">
              <SubmitButton>Filtrar</SubmitButton>
              <a
                href="/admin"
                className="inline-flex h-10 items-center rounded-md border border-[#cbd3c9] bg-white px-4 text-sm font-semibold text-[#26382f]"
              >
                Limpiar
              </a>
            </div>
          </form>

          <div className="mt-5 grid gap-3">
            {reservations.length > 0 ? (
              reservations.map((reservation) => {
                const reservationUser = userById.get(reservation.userId);

                return (
                    <div
                      key={reservation.id}
                      className="grid gap-3 rounded-md border border-[#e2e6df] p-4 lg:grid-cols-[1fr_auto]"
                    >
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
                        <p className="mt-2 text-sm font-semibold text-[#26382f]">
                          {formatCurrency(reservation.totalPrice)} total -{" "}
                          {formatCurrency(reservation.depositAmount)} sena
                        </p>
                        <div className="mt-3 grid gap-1 text-sm text-[#526158]">
                          <p className="font-semibold text-[#26382f]">
                            {reservationUser?.name ?? "Usuario"}
                          </p>
                          <p>
                            {reservationUser?.email ?? reservation.userId}
                            {reservationUser?.phone
                              ? ` - ${reservationUser.phone}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[auto_1fr] lg:min-w-[480px]">
                        <span
                          className={`h-10 self-start rounded-md px-3 py-2 text-sm font-semibold ${statusBadgeClassName(
                            reservation.status,
                          )}`}
                        >
                          {statusLabels[reservation.status]}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {adminStatusActions.map(([status, label]) => (
                            <form
                              key={`${reservation.id}-${status}`}
                              action={updateReservationStatusAction}
                            >
                              <input
                                type="hidden"
                                name="id"
                                value={reservation.id}
                              />
                              <input
                                type="hidden"
                                name="status"
                                value={status}
                              />
                              <button
                                type="submit"
                                disabled={reservation.status === status}
                                className="h-10 rounded-md border border-[#cbd3c9] bg-white px-3 text-sm font-semibold text-[#26382f] transition hover:border-[#8ea090] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {label}
                              </button>
                            </form>
                          ))}
                        </div>
                      </div>
                    </div>
                );
              })
            ) : (
              <p className="rounded-md bg-[#f6f7f4] p-4 text-sm text-[#526158]">
                No hay reservas proximas.
              </p>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-[#d9ded5] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7b3f28]">
                Disponibilidad
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#26382f]">
                Bloqueos por cancha
              </h2>
              <p className="mt-1 text-sm text-[#526158]">
                Usa bloqueos para mantenimiento, clases, torneos o reservas
                administrativas.
              </p>
            </div>
            <Link
              href={`/admin?date=${selectedDate}`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-[#cbd3c9] bg-white px-4 text-sm font-semibold text-[#26382f]"
            >
              {selectedDate}
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {blockStats.map((item) => (
              <div key={item.label} className="rounded-md bg-[#f6f7f4] p-4">
                <p className="text-sm font-medium text-[#526158]">
                  {item.label}
                </p>
                <p className="mt-2 text-lg font-semibold text-[#26382f]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 overflow-hidden rounded-md border border-[#e2e6df]">
            <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-3">
              {courts.length > 0 ? (
                courts.map((court) => {
                  const courtBlocks = blocksForSelectedDate.filter(
                    (block) => block.courtId === court.id,
                  );

                  return (
                    <div
                      key={court.id}
                      className="border-b border-[#e2e6df] p-4 md:border-r xl:[&:nth-child(3n)]:border-r-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#26382f]">
                            {court.name}
                          </p>
                          <p className="mt-1 text-sm text-[#526158]">
                            {court.active ? "Activa" : "Inactiva"}
                          </p>
                        </div>
                        <span
                          className={`rounded-md px-3 py-2 text-sm font-semibold ${
                            courtBlocks.length > 0
                              ? "bg-[#fff3ee] text-[#7b3f28]"
                              : "bg-[#edf4ef] text-[#164b35]"
                          }`}
                        >
                          {courtBlocks.length > 0 ? "Con bloqueos" : "Libre"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2">
                        {courtBlocks.length > 0 ? (
                          courtBlocks.map((block) => (
                            <div
                              key={block.id}
                              className="grid gap-3 rounded-md border border-[#e7b8a4] bg-[#fffaf7] p-3 sm:grid-cols-[1fr_auto]"
                            >
                              <div>
                                <p className="text-sm font-semibold text-[#7b3f28]">
                                  {formatTimeRange(
                                    block.startsAt,
                                    block.endsAt,
                                  )}
                                </p>
                                <p className="mt-1 text-sm text-[#526158]">
                                  {block.reason}
                                </p>
                              </div>
                              <form
                                action={deleteCourtBlockAction}
                                className="self-start"
                              >
                                <input type="hidden" name="id" value={block.id} />
                                <button
                                  type="submit"
                                  className="h-9 rounded-md border border-[#d6b2a2] bg-white px-3 text-sm font-semibold text-[#7b3f28] transition hover:bg-[#fff3ee]"
                                >
                                  Quitar
                                </button>
                              </form>
                            </div>
                          ))
                        ) : (
                          <p className="rounded-md bg-[#f6f7f4] p-3 text-sm text-[#526158]">
                            Sin bloqueos para esta fecha.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="p-4 text-sm text-[#526158]">
                  No hay canchas cargadas.
                </p>
              )}
            </div>
          </div>

          <form
            action={createCourtBlockAction}
            className="mt-5 grid gap-3 rounded-md bg-[#f6f7f4] p-4 md:grid-cols-[1fr_160px_130px_130px_1fr_auto]"
          >
            <Field label="Cancha">
              <select
                name="courtId"
                required
                className={textInputClassName("appearance-none")}
              >
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fecha">
              <input
                type="date"
                name="date"
                min={getTodayValue()}
                defaultValue={selectedDate}
                className={textInputClassName()}
              />
            </Field>
            <Field label="Desde">
              <input
                type="time"
                name="startsAt"
                defaultValue={CLUB_OPENING_START}
                className={textInputClassName()}
              />
            </Field>
            <Field label="Hasta">
              <input
                type="time"
                name="endsAt"
                defaultValue="09:00"
                className={textInputClassName()}
              />
            </Field>
            <Field label="Motivo">
              <input
                name="reason"
                placeholder="Mantenimiento"
                required
                className={textInputClassName()}
              />
            </Field>
            <div className="self-end">
              <SubmitButton>Bloquear</SubmitButton>
            </div>
          </form>

          <div className="mt-5 grid gap-3">
            {blocks.length > 0 ? (
              blocks.map((block) => (
                <div
                  key={block.id}
                  className="grid gap-3 rounded-md border border-[#e2e6df] p-4 md:grid-cols-[1fr_1fr_auto]"
                >
                  <div>
                    <p className="font-semibold text-[#26382f]">
                      {courtNameById.get(block.courtId) ?? "Cancha"}
                    </p>
                    <p className="mt-1 text-sm text-[#526158]">
                      {block.reason}
                    </p>
                  </div>
                  <p className="self-center text-sm font-medium text-[#526158]">
                    {formatDateTime(block.startsAt)} hasta{" "}
                    {formatDateTime(block.endsAt)}
                  </p>
                  <form action={deleteCourtBlockAction} className="self-center">
                    <input type="hidden" name="id" value={block.id} />
                    <button
                      type="submit"
                      className="h-10 rounded-md border border-[#d6b2a2] bg-white px-4 text-sm font-semibold text-[#7b3f28] transition hover:bg-[#fff3ee]"
                    >
                      Quitar
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <p className="rounded-md bg-[#f6f7f4] p-4 text-sm text-[#526158]">
                No hay bloqueos proximos.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
